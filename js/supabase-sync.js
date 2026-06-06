(function () {
  'use strict';

  const FT_SB_KEYS = {
    url: 'ft_supabase_url_v1',
    anonKey: 'ft_supabase_anon_v1',
    bucket: 'ft_supabase_bucket_v1',
    syncId: 'ft_supabase_sync_id_v1',
    keyHex: 'ft_supabase_key_v1',
  };

  const FT_DEFAULT_BUCKET = 'family-tree';
  const FT_DEFAULT_SYNC_ID = 'family-sync';

  function _ftReadSettings() {
    const read = (k) => {
      try { return (localStorage.getItem(k) || '').trim(); } catch (e) { return ''; }
    };
    return {
      url: read(FT_SB_KEYS.url),
      anonKey: read(FT_SB_KEYS.anonKey),
      bucket: read(FT_SB_KEYS.bucket) || FT_DEFAULT_BUCKET,
      syncId: read(FT_SB_KEYS.syncId) || FT_DEFAULT_SYNC_ID,
      keyHex: read(FT_SB_KEYS.keyHex) || (window.CLOUD_CONFIG?.KEY_HEX || ''),
    };
  }

  function _ftSaveSettings(next) {
    const settings = { ..._ftReadSettings(), ...(next || {}) };
    if (settings.url) try { localStorage.setItem(FT_SB_KEYS.url, settings.url); } catch (e) {}
    if (settings.anonKey) try { localStorage.setItem(FT_SB_KEYS.anonKey, settings.anonKey); } catch (e) {}
    if (settings.bucket) try { localStorage.setItem(FT_SB_KEYS.bucket, settings.bucket); } catch (e) {}
    if (settings.syncId) try { localStorage.setItem(FT_SB_KEYS.syncId, settings.syncId); } catch (e) {}
    if (settings.keyHex) try { localStorage.setItem(FT_SB_KEYS.keyHex, settings.keyHex); } catch (e) {}
    if (window.CLOUD_CONFIG) {
      try { window.CLOUD_CONFIG.KEY_HEX = settings.keyHex || window.CLOUD_CONFIG.KEY_HEX || ''; } catch (e) {}
      try { window.CLOUD_CONFIG.GIST_ID = settings.syncId || window.CLOUD_CONFIG.GIST_ID || ''; } catch (e) {}
      try { window.CLOUD_CONFIG.GITHUB_PAT = ''; } catch (e) {}
    }
    return settings;
  }

  function _ftEnsureHexKey(hex) {
    if (!hex || typeof hex !== 'string') return '';
    const clean = hex.trim();
    return /^[0-9a-fA-F]{64}$/.test(clean) ? clean.toLowerCase() : '';
  }

  function _ftAutoGenerateKey() {
    return [...crypto.getRandomValues(new Uint8Array(32))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function _ftAutoGenerateSyncId() {
    return 'ft_' + [...crypto.getRandomValues(new Uint8Array(12))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function _ftNormalizeUrl(url) {
    const raw = (url || '').trim().replace(/\/+$/, '');
    return raw;
  }

  function _ftStoragePath(fileName) {
    const s = _ftReadSettings();
    return `${s.syncId}/${fileName}`;
  }

  function _ftNormalizeSupabaseError(err) {
    if (!err) return 'خطأ غير معروف';
    if (typeof err === 'string') return err;
    return err.message || err.error_description || err.statusText || 'خطأ غير معروف';
  }

  async function _ftLoadSupabaseModule() {
    if (!window.__ftSupabaseModulePromise) {
      window.__ftSupabaseModulePromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    }
    return window.__ftSupabaseModulePromise;
  }

  async function _ftGetSupabaseClient() {
    const s = _ftReadSettings();
    const url = _ftNormalizeUrl(s.url);
    const anonKey = (s.anonKey || '').trim();
    if (!url || !anonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }
    if (!window.__ftSupabaseClient || window.__ftSupabaseClient.__ftUrl !== url || window.__ftSupabaseClient.__ftAnonKey !== anonKey) {
      const { createClient } = await _ftLoadSupabaseModule();
      window.__ftSupabaseClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
      window.__ftSupabaseClient.__ftUrl = url;
      window.__ftSupabaseClient.__ftAnonKey = anonKey;
    }

    const client = window.__ftSupabaseClient;
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr) {
      throw new Error('تعذّر قراءة جلسة Supabase: ' + _ftNormalizeSupabaseError(sessionErr));
    }
    if (!sessionData?.session) {
      const { data, error } = await client.auth.signInAnonymously();
      if (error) {
        throw new Error(
          'تعذّر تسجيل الدخول المجهول في Supabase: ' +
            _ftNormalizeSupabaseError(error) +
            ' — فعّل Anonymous Sign-Ins من لوحة Supabase'
        );
      }
      if (!data?.session) {
        const { data: retrySession } = await client.auth.getSession();
        if (!retrySession?.session) {
          throw new Error('فشل إنشاء جلسة Supabase');
        }
      }
    }
    return client;
  }

  function _ftSettingsReady() {
    const s = _ftReadSettings();
    return !!(_ftNormalizeUrl(s.url) && s.anonKey && s.bucket && s.syncId && _ftEnsureHexKey(s.keyHex));
  }

  window._isCloudConfigured = function () {
    return _ftSettingsReady();
  };

  window.cloudEncrypt = async function (plainText) {
    const s = _ftReadSettings();
    const keyHex = _ftEnsureHexKey(s.keyHex);
    if (!keyHex) throw new Error('مفتاح التشفير غير صالح');
    const key = await crypto.subtle.importKey(
      'raw',
      _hexToBytes(keyHex),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined = new Uint8Array(12 + cipher.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipher), 12);
    return _bytesToBase64(combined);
  };

  window.cloudDecrypt = async function (b64) {
    const s = _ftReadSettings();
    const keyHex = _ftEnsureHexKey(s.keyHex);
    if (!keyHex) throw new Error('مفتاح التشفير غير صالح');
    const key = await crypto.subtle.importKey(
      'raw',
      _hexToBytes(keyHex),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const combined = _base64ToBytes((b64 || '').trim());
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plain);
  };

  async function _ftUploadText(fileName, plainText) {
    const client = await _ftGetSupabaseClient();
    const { bucket } = _ftReadSettings();
    const path = _ftStoragePath(fileName);
    const body = new Blob([plainText], { type: 'application/octet-stream' });
    const { error } = await client.storage.from(bucket).upload(path, body, {
      upsert: true,
      contentType: 'application/octet-stream',
      cacheControl: '3600',
    });
    if (error) throw error;
  }

  async function _ftDownloadText(fileName) {
    const client = await _ftGetSupabaseClient();
    const { bucket } = _ftReadSettings();
    const path = _ftStoragePath(fileName);
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error) throw error;
    if (!data) throw new Error('الملف غير موجود: ' + fileName);
    return await data.text();
  }

  async function _ftDeletePath(fileName) {
    const client = await _ftGetSupabaseClient();
    const { bucket } = _ftReadSettings();
    const path = _ftStoragePath(fileName);
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  function _ftBuildPhotosMap() {
    const photosMap = {};
    (people || []).forEach((p) => {
      if (p && _isValidPhoto(p.photo)) photosMap[p.id] = p.photo;
    });
    return photosMap;
  }

  function _ftBuildBaseData() {
    const data = JSON.parse(JSON.stringify({
      people,
      relPairs,
      nextId,
      myPersonId: myPersonId || null,
    }));
    if (data.people && Array.isArray(data.people)) {
      data.people.forEach((p) => { if (p && p.photo !== undefined) delete p.photo; });
    }
    return data;
  }

  async function _ftPhotoFingerprint(photo) {
    if (!_isValidPhoto(photo)) return '';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(photo));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function _ftBuildPhotoMetaMapFromMap(photosMap) {
    const out = {};
    const entries = Object.entries(photosMap || {});
    for (const [id, photo] of entries) {
      if (!_isValidPhoto(photo)) continue;
      out[id] = {
        hash: await _ftPhotoFingerprint(photo),
        size: photo.length,
        updatedAt: new Date().toISOString(),
      };
    }
    return out;
  }

  async function _ftBuildPhotoMetaMapFromPeople(list) {
    const out = {};
    for (const p of (list || [])) {
      if (p && _isValidPhoto(p.photo)) {
        out[p.id] = {
          hash: await _ftPhotoFingerprint(p.photo),
          size: p.photo.length,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    return out;
  }

  function _ftMatchLocalPersonForPhoto(remotePerson) {
    const arr = Array.isArray(people) ? people : [];
    if (!remotePerson || !arr.length) return null;
    const byId = arr.find((lp) => lp && lp.id === remotePerson.id);
    if (byId) return byId;
    return arr.find((lp) => {
      if (!lp) return false;
      if (normalizeAr(lp.name) !== normalizeAr(remotePerson.name)) return false;
      if (remotePerson.gender && lp.gender && remotePerson.gender !== lp.gender) return false;
      return true;
    }) || null;
  }

  async function _ftComputePhotoConflicts(incomingPeople, cloudPhotos) {
    const conflicts = [];
    const cloudList = Array.isArray(incomingPeople) ? incomingPeople : [];
    for (const cp of cloudList) {
      const cPhoto = _isValidPhoto(cloudPhotos && cloudPhotos[cp.id] ? cloudPhotos[cp.id] : cp.photo)
        ? (cloudPhotos && cloudPhotos[cp.id] ? cloudPhotos[cp.id] : cp.photo)
        : '';
      if (!_isValidPhoto(cPhoto)) continue;
      const local = _ftMatchLocalPersonForPhoto(cp);
      if (!local || !_isValidPhoto(local.photo)) continue;
      const [localHash, cloudHash] = await Promise.all([
        _ftPhotoFingerprint(local.photo),
        _ftPhotoFingerprint(cPhoto),
      ]);
      if (localHash !== cloudHash) {
        conflicts.push({
          personId: cp.id,
          name: _familyDisplayName ? _familyDisplayName(local) : (local.name || cp.name || '—'),
          localPhoto: local.photo,
          cloudPhoto: cPhoto,
          localHash,
          cloudHash,
        });
      }
    }
    return { conflicts, total: cloudList.length };
  }

  function _ftSetConflictChoice(personId, choice) {
    if (!window._ftSmartSyncState) return;
    window._ftSmartSyncState.choices[String(personId)] = choice;
  }

  function _ftSetAllConflictChoices(choice) {
    const state = window._ftSmartSyncState;
    if (!state || !state.preview || !Array.isArray(state.preview.conflicts)) return;
    state.preview.conflicts.forEach((c) => {
      state.choices[String(c.personId)] = choice;
      const input = document.querySelector(`input[name="ft_conflict_${c.personId}"][value="${choice}"]`);
      if (input) input.checked = true;
    });
  }

  async function _ftOpenPhotoConflictModal(preview) {
    const items = preview.conflicts || [];
    const total = items.length;
    const rows = items.map((c) => {
      const rowName = `ft_conflict_${c.personId}`;
      const title = escapeHtml(c.name || '—');
      const pid = escapeHtml(String(c.personId));
      const choiceKey = String(c.personId);
      return `
        <div style="padding:10px 12px;border:1px solid var(--card-border);border-radius:12px;background:var(--card-bg);margin-bottom:10px;position:relative;z-index:1;pointer-events:auto">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">${title}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:2px">#${pid}</div>
            </div>
            <div style="font-size:11px;color:#1d4ed8;background:#dbeafe;border:1px solid #93c5fd;border-radius:999px;padding:2px 8px">تعارض صورة</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <label style="display:block;border:1px solid var(--card-border);border-radius:10px;padding:8px;background:var(--bg-secondary);cursor:pointer">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:12px;font-weight:700;color:var(--text)">المحلية</span>
                <input type="radio" name="${rowName}" value="local" checked onchange="window._ftSetConflictChoice(${JSON.stringify(choiceKey)}, 'local')">
              </div>
              <div style="font-size:11px;color:var(--text2);margin-bottom:6px">معاينة الصورة المحلية</div><img loading="lazy" src="${c.localPhoto||''}" alt="local" onerror="this.outerHTML='<div style=\'padding:20px;text-align:center;font-size:12px;color:var(--text2);border:1px dashed var(--card-border);border-radius:8px\'>تعذر عرض الصورة المحلية</div>'" style="display:block;width:100%;min-height:120px;max-height:220px;object-fit:contain;border-radius:8px;border:1px solid var(--card-border);background:#fff">
            </label>
            <label style="display:block;border:1px solid var(--card-border);border-radius:10px;padding:8px;background:var(--bg-secondary);cursor:pointer">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:12px;font-weight:700;color:var(--text)">السحابية</span>
                <input type="radio" name="${rowName}" value="cloud" onchange="window._ftSetConflictChoice(${JSON.stringify(choiceKey)}, 'cloud')">
              </div>
              <div style="font-size:11px;color:var(--text2);margin-bottom:6px">معاينة الصورة السحابية</div><img loading="lazy" src="${c.cloudPhoto||''}" alt="cloud" onerror="this.outerHTML='<div style=\'padding:20px;text-align:center;font-size:12px;color:var(--text2);border:1px dashed var(--card-border);border-radius:8px\'>تعذر عرض الصورة السحابية</div>'" style="display:block;width:100%;min-height:120px;max-height:220px;object-fit:contain;border-radius:8px;border:1px solid var(--card-border);background:#fff">
            </label>
          </div>
        </div>`;
    }).join('');

    window._ftSmartSyncState = {
      preview,
      choices: {},
    };

    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this){window._ftSmartSyncState=null;closeModal();}">
        <div class="modal" style="max-width:920px;width:min(920px,96vw);position:relative;z-index:2;pointer-events:auto">
          <h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">🟦 تعارضات الصور <span style="font-size:12px;font-weight:400;color:var(--text2)">${total} حالة</span></h3>
          <div style="font-size:12px;color:var(--text2);line-height:1.8;margin-bottom:12px;background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px">
            الصور غير المتعارضة ستُدمج تلقائياً. تمت إضافة معاينة مباشرة لكل صورة محلية وسحابية قبل الدمج. اختر لكل تعارض: المحلية أو السحابية، ثم اضغط دمج.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;position:relative;z-index:1">
            <button class="btn" onclick="window._ftSetAllConflictChoices('local')" style="font-size:12px">اعتماد المحلية للجميع</button>
            <button class="btn" onclick="window._ftSetAllConflictChoices('cloud')" style="font-size:12px">اعتماد السحابية للجميع</button>
          </div>
          <div style="max-height:58vh;overflow-y:auto;padding-left:2px;position:relative;z-index:1">${rows || '<div class="no-results">لا توجد تعارضات</div>'}</div>
          <div class="modal-footer" style="margin-top:10px;position:relative;z-index:1">
            <button class="btn primary" onclick="window._ftApplySmartSyncResolution()">✔ دمج المختار</button>
            <button class="btn" onclick="window._ftSmartSyncState=null;closeModal()">إلغاء</button>
          </div>
        </div>
      </div>`;
  }

  async function _ftFinalizeSmartSync(dataObj, cloudPhotos, conflictChoices, previewMeta) {
    const backup = _cloneMergeState();
    const result = _cloudSmartMerge(dataObj || { people: [], relPairs: [], nextId: 1 }, { mode: 'cloud' });
    let appliedCloud = 0;
    const choiceMap = conflictChoices || {};
    const incomingPeople = Array.isArray(dataObj && dataObj.people) ? dataObj.people : [];

    incomingPeople.forEach((cp) => {
      const cPhoto = _isValidPhoto(cloudPhotos && cloudPhotos[cp.id] ? cloudPhotos[cp.id] : cp.photo)
        ? (cloudPhotos && cloudPhotos[cp.id] ? cloudPhotos[cp.id] : cp.photo)
        : '';
      if (!_isValidPhoto(cPhoto)) return;
      const choice = choiceMap[String(cp.id)] || choiceMap[cp.id] || 'local';
      if (choice !== 'cloud') return;

      const target = (people || []).find((p) => p.id === cp.id) || _ftMatchLocalPersonForPhoto(cp);
      if (target) {
        target.photo = cPhoto;
        appliedCloud++;
      }
    });

    try { migrateExternalSpouses(); } catch (e) {}
    try { _invalidateAll(); } catch (e) {}
    try { _markDeviceInit(); } catch (e) {}
    try { saveData(); } catch (e) {}
    try { _persistPhotosToIDB().catch(() => {}); } catch (e) {}
    try { renderAll(); } catch (e) {}
    try { updateMyPersonBtn(); } catch (e) {}

    const photoMeta = await _ftBuildPhotoMetaMapFromPeople(people);
    _saveSyncedHashes(photoMeta);

    _recordMergeHistory({
      source: 'supabase-smart-sync',
      kind: 'single',
      added: result.added || 0,
      updated: result.updated || 0,
      note: 'مزامنة ذكية من Supabase',
      mergeMode: 'cloud',
      photoConflicts: (previewMeta && previewMeta.conflicts) || 0,
      cloudPhotoOverrides: appliedCloud,
    }, backup);

    try { _setLastSync(); } catch (e) {}
    _syncLog('ok', 'مزامنة ذكية من Supabase', `+${result.added || 0} جديد، تحديث ${result.updated || 0}، ${appliedCloud} صور محسومة`);
    _showCloudToast(`✅ دُمج ذكيًا: +${result.added || 0} جديد · ${result.updated || 0} تحديث · ${appliedCloud} صور محسومة`, 'success', 4000);
    return { added: result.added || 0, updated: result.updated || 0, appliedCloud };
  }

  async function _ftApplySmartSyncResolution() {
    const state = window._ftSmartSyncState;
    if (!state || !state.preview) return;
    const choices = {};
    (state.preview.conflicts || []).forEach((c) => {
      const selected = document.querySelector(`input[name="ft_conflict_${c.personId}"]:checked`);
      choices[String(c.personId)] = selected ? selected.value : 'local';
    });
    window._ftSmartSyncState = null;
    closeModal();
    await _ftFinalizeSmartSync(state.preview.data, state.preview.cloudPhotos || {}, choices, state.preview);
  }

  window._ftSetConflictChoice = _ftSetConflictChoice;
  window._ftSetAllConflictChoices = _ftSetAllConflictChoices;
  window._ftOpenPhotoConflictModal = _ftOpenPhotoConflictModal;
  window._ftApplySmartSyncResolution = _ftApplySmartSyncResolution;
  window._ftSmartSyncFromSupabase = _ftSmartSyncFromSupabase;

  async function _ftSmartSyncFromSupabase(dataObj, cloudPhotos) {
    const preview = await _ftComputePhotoConflicts((dataObj && dataObj.people) || [], cloudPhotos || {});
    if (preview.conflicts.length) {
      preview.data = dataObj;
      preview.cloudPhotos = cloudPhotos || {};
      preview.cloudOnly = (preview.total || 0) - preview.conflicts.length;
      await _ftOpenPhotoConflictModal(preview);
      _syncLog('warn', 'توجد تعارضات صور', String(preview.conflicts.length));
      _showCloudToast(`🟦 ${preview.conflicts.length} تعارض صورة يحتاج مراجعة`, 'info', 4000);
      return { pending: true, conflicts: preview.conflicts.length };
    }
    return await _ftFinalizeSmartSync(dataObj, cloudPhotos || {}, {}, preview);
  }

  function _ftApplyLoadedPhotos(loadedData, cloudPhotos, forcePhotos) {
    const photoMap = cloudPhotos && typeof cloudPhotos === 'object' ? cloudPhotos : {};
    loadedData.people.forEach((p) => {
      const cPhoto = photoMap[p.id] || photoMap[String(p.id)];
      if (!cPhoto || typeof cPhoto !== 'string' || cPhoto.length < 100) return;
      const localP = (people || []).find((lp) => lp.id === p.id);
      const localPhoto = localP ? localP.photo : null;
      if (forcePhotos || !localPhoto) {
        p.photo = cPhoto;
      } else if (localPhoto.length !== cPhoto.length) {
        p.photo = cPhoto;
      } else {
        p.photo = localPhoto;
      }
    });
  }

  async function _ftSupabaseSave() {

    if (!_ftSettingsReady()) {
      openCloudSetup();
      return;
    }
    if (_cloudSyncing) {
      _showCloudToast('⏳ عملية مزامنة جارية بالفعل...','info',2000);
      return;
    }
    _cloudSyncing = true;
    _updateCloudBtn('syncing');

    const validPhotos = (people || []).filter((p) => _isValidPhoto(p.photo));
    const invalidCount = (people || []).filter((p) => p.photo && !_isValidPhoto(p.photo)).length;
    if (invalidCount > 0) _syncLog('warn', 'صور غير صالحة تم تجاهلها', String(invalidCount));

    try {
      const dataNoPhotos = _ftBuildBaseData();
      const photosMap = _ftBuildPhotosMap();
      const encData = await cloudEncrypt(JSON.stringify(dataNoPhotos));
      const encPhotos = Object.keys(photosMap).length ? await cloudEncrypt(JSON.stringify(photosMap)) : '';
      const meta = {
        version: 1,
        updatedAt: new Date().toISOString(),
        people: people.length,
        photos: Object.keys(photosMap).length,
      };

      _showCloudToast('🔄 جارٍ الحفظ على Supabase...','syncing',0);
      await _ftUploadText('data.enc', encData);
      if (encPhotos) {
        await _ftUploadText('photos.enc', encPhotos);
      } else {
        try { await _ftDeletePath('photos.enc'); } catch (e) {}
      }
      await _ftUploadText('meta.json', JSON.stringify(meta));

      const newHashes = await _ftBuildPhotoMetaMapFromMap(photosMap);
      _saveSyncedHashes(newHashes);
      _setLastSync();
      _syncLog('ok', 'تم الحفظ على Supabase', `${people.length} فرد، ${Object.keys(photosMap).length} صورة`);
      _showCloudToast(`☁️ تم الحفظ ✓ · ${people.length} فرد · ${Object.keys(photosMap).length} صورة`, 'success', 3500);
      _updateCloudBtn('ok');
    } catch (e) {
      const msg = _ftNormalizeSupabaseError(e);
      _syncLog('error', 'فشل الحفظ على Supabase', msg);
      _showCloudToast('❌ فشل الحفظ: ' + msg, 'error', 5000);
      _updateCloudBtn('error');
    } finally {
      _cloudSyncing = false;
      _updateCloudBtn('ok');
    }
  }

  async function _ftSupabaseLoad(forceReplace) {
    if (!_ftSettingsReady()) {
      openCloudSetup();
      return false;
    }
    if (_cloudSyncing) {
      _showCloudToast('⏳ عملية مزامنة جارية...','info',2000);
      return false;
    }
    _cloudSyncing = true;
    _updateCloudBtn('syncing');
    _showCloudToast('🔄 جارٍ التحميل من Supabase...','syncing',0);

    try {
      const encData = await _ftDownloadText('data.enc');
      const d = JSON.parse(await cloudDecrypt(encData.trim()));
      if (!d.people || !Array.isArray(d.people)) throw new Error('بيانات غير صالحة');

      let cloudPhotos = null;
      try {
        const encPhotos = await _ftDownloadText('photos.enc');
        if (encPhotos && encPhotos.trim()) {
          cloudPhotos = JSON.parse(await cloudDecrypt(encPhotos.trim()));
        }
      } catch (pe) {
        _syncLog('warn', 'فشل تحميل الصور من Supabase', pe.message || String(pe));
      }

      if (forceReplace) {
        people = d.people;
        nextId = d.nextId || 1;
        relPairs = d.relPairs || [];
        if (d.myPersonId) {
          myPersonId = parseInt(d.myPersonId, 10);
          saveMyPerson();
        }
        expanded = {};
        people.forEach((p) => { expanded[p.id] = false; });
        migrateExternalSpouses();
        if (people.length) expanded[people[0].id] = true;
        if (cloudPhotos) {
          Object.keys(cloudPhotos).forEach((id) => {
            const target = (people || []).find((p) => String(p.id) === String(id));
            if (target && _isValidPhoto(cloudPhotos[id])) target.photo = cloudPhotos[id];
          });
        }
        const newH2 = await _ftBuildPhotoMetaMapFromPeople(people);
        _saveSyncedHashes(newH2);
        _markDeviceInit();
        saveData();
        _persistPhotosToIDB().catch(() => {});
        renderAll();
        updateMyPersonBtn();
        _setLastSync();
        _syncLog('ok', 'استبدال كامل من Supabase', `${d.people.length} فرد`);
        _showCloudToast(`✅ استبدال كامل — ${d.people.length} فرد`, 'success', 4000);
        return d;
      }

      const smartResult = await _ftSmartSyncFromSupabase(d, cloudPhotos || {});
      if (smartResult && smartResult.pending) {
        return d;
      }
      return d;
    } catch (e) {
      const msg = _ftNormalizeSupabaseError(e);
      _syncLog('error', 'فشل التحميل من Supabase', msg);
      _showCloudToast('❌ فشل التحميل: ' + msg, 'error', 5000);
      return false;
    } finally {
      _cloudSyncing = false;
      _updateCloudBtn('ok');
    }
  }

  window.cloudSave = async function () { return _ftSupabaseSave(); };

  window.cloudLoad = async function (forcePhotos) { return _ftSupabaseLoad(forcePhotos); };

  window._doUpload = async function () { return _ftSupabaseSave(); };
  window._doDownload = async function (forceReplace) { return _ftSupabaseLoad(forceReplace); };

  window.manualCloudSync = async function () {
    if (!_ftSettingsReady()) { openCloudSetup(); return; }
    openCloudSyncPanel();
  };

  window.cloudRestorePrompt = async function () {
    if (!_ftSettingsReady()) { openCloudSetup(); return; }
    if (confirm('سيستبدل المحتوى المحلي بالنسخة الموجودة على Supabase. هل تريد المتابعة؟')) {
      await _ftSupabaseLoad(true);
    }
  };

  window._copyGistId = function () {
    const s = _ftReadSettings();
    const text = s.syncId || '';
    if (!text) return;
    const btn = document.getElementById('copyGistBtn');
    navigator.clipboard.writeText(text).then(function () {
      if (btn) btn.textContent = '✅';
      setTimeout(function () { if (btn) btn.textContent = '📋'; }, 1800);
    }).catch(function () {
      prompt('انسخ المعرّف:', text);
    });
  };

  window.openCloudSetup = function () {
    const s = _ftReadSettings();
    const currentKey = _ftEnsureHexKey(s.keyHex);
    const keyValue = currentKey || _ftAutoGenerateKey();
    const syncId = s.syncId || _ftAutoGenerateSyncId();
    const html = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:560px">
        <h3>☁️ إعداد Supabase المشفّر</h3>
        <div style="font-size:12px;color:var(--text2);background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.7">
          <strong style="color:var(--text)">كيف يعمل؟</strong><br>
          يتم تشفير البيانات والصور محلياً بـ AES-GCM قبل الرفع إلى Supabase Storage.<br>
          لا يخرج نص غير مشفر من المتصفح، ومفتاح التشفير يبقى عندك فقط.
        </div>

        <div class="form-row">
          <label>رابط Supabase Project URL</label>
          <input id="cs_sb_url" type="text" value="${s.url || ''}" style="font-family:monospace;font-size:11px" placeholder="https://xxxx.supabase.co">
        </div>

        <div class="form-row">
          <label>Supabase anon / publishable key</label>
          <div style="display:flex;gap:6px">
            <input id="cs_sb_anon" type="password" value="${s.anonKey || ''}" style="font-family:monospace;font-size:11px;flex:1" placeholder="sb_publishable_... أو anon key">
            <button class="btn" onclick="const i=document.getElementById('cs_sb_anon');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
          </div>
        </div>

        <div class="form-row">
          <label>اسم Bucket</label>
          <input id="cs_sb_bucket" type="text" value="${s.bucket || FT_DEFAULT_BUCKET}" style="font-family:monospace;font-size:11px" placeholder="family-tree">
        </div>

        <div class="form-row">
          <label>معرّف المزامنة المشترك بين أجهزة المالك</label>
          <div style="display:flex;gap:6px">
            <input id="cs_sb_sync" type="text" value="${syncId}" style="font-family:monospace;font-size:11px;flex:1" placeholder="ft_...">
            <button class="btn" onclick="document.getElementById('cs_sb_sync').value='${_ftAutoGenerateSyncId()}'" style="font-size:11px" title="توليد معرّف جديد">🎲</button>
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:4px">هذا ليس سراً بذاته، لكنه جزء من عنوان التخزين، ويُفضّل أن يبقى عند المالك فقط.</div>
        </div>

        <div class="form-row">
          <label>مفتاح التشفير AES-256 (64 حرف hex)</label>
          <div style="display:flex;gap:6px">
            <input id="cs_sb_key" type="password" value="${keyValue}" style="font-family:monospace;font-size:11px;flex:1" placeholder="64 حرف hex">
            <button class="btn" onclick="const i=document.getElementById('cs_sb_key');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
            <button class="btn" onclick="document.getElementById('cs_sb_key').value='${_ftAutoGenerateKey()}'" style="font-size:11px" title="توليد مفتاح جديد">🎲</button>
          </div>
          <div style="font-size:11px;color:#ef4444;margin-top:4px">احتفظ بالمفتاح في مكان آمن، لأن فقدانه يعني فقدان القدرة على فك النسخ القديمة.</div>
        </div>

        <div style="padding:10px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;font-size:12px;color:#1d4ed8;margin-bottom:10px;line-height:1.6">
          <strong>خطوات Supabase المطلوبة خارج التطبيق:</strong><br>
          1) أنشئ Bucket بنفس الاسم أعلاه.<br>
          2) فعّل Anonymous Sign-Ins.<br>
          3) أضف Policy تسمح للمستخدمين authenticated بالرفع والقراءة داخل bucketك.<br>
          4) استخدم نفس URL وanon key وBucket وSync ID وKey على الأجهزة الأخرى.
        </div>

        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">إلغاء</button>
          <button class="btn primary" onclick="applyCloudSetup()">✓ تطبيق وحفظ</button>
        </div>
      </div>
    </div>`;
    document.getElementById('modalContainer').innerHTML = html;
  };

  window.applyCloudSetup = async function () {
    const url = _ftNormalizeUrl((document.getElementById('cs_sb_url')?.value || '').trim());
    const anonKey = (document.getElementById('cs_sb_anon')?.value || '').trim();
    const bucket = (document.getElementById('cs_sb_bucket')?.value || '').trim() || FT_DEFAULT_BUCKET;
    const syncId = (document.getElementById('cs_sb_sync')?.value || '').trim() || _ftAutoGenerateSyncId();
    let keyHex = (document.getElementById('cs_sb_key')?.value || '').trim();
    keyHex = _ftEnsureHexKey(keyHex);

    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      alert('أدخل رابط Supabase صالح مثل https://xxxx.supabase.co');
      return;
    }
    if (!anonKey) {
      alert('أدخل Supabase anon / publishable key');
      return;
    }
    if (!keyHex) {
      alert('مفتاح التشفير يجب أن يكون 64 حرف hex صالح');
      return;
    }
    _ftSaveSettings({ url, anonKey, bucket, syncId, keyHex });
    _cloudEnabled = true;
    _showCloudButtons(true);
    const banner = document.getElementById('cloudSetupBanner');
    if (banner) banner.style.display = 'none';
    closeModal();
    _showCloudToast('✅ تم حفظ إعدادات Supabase بنجاح', 'success', 2500);
    try {
      await _ftGetSupabaseClient();
      _syncLog('ok', 'اتصال Supabase ناجح', bucket + ' / ' + syncId);
    } catch (e) {
      const msg = _ftNormalizeSupabaseError(e);
      _syncLog('warn', 'تعذّر اختبار الجلسة', msg);
      _showCloudToast('⚠️ تم الحفظ لكن الاختبار لم ينجح: ' + msg, 'error', 5000);
    }
  };

  window.openCloudSyncPanel = function () {
    if (!_ftSettingsReady()) { openCloudSetup(); return; }
    const s = _ftReadSettings();
    const validPhotos = (people || []).filter((p) => _isValidPhoto(p.photo));
    const invalidCount = (people || []).filter((p) => p.photo && !_isValidPhoto(p.photo)).length;
    const sizeKB = Math.round(validPhotos.reduce((sum, p) => sum + p.photo.length * 0.75 / 1024, 0));
    const sizeLabel = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';
    const lastSync = _getLastSync();
    const lastLabel = lastSync ? new Date(lastSync).toLocaleString('ar-SA', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) : 'لم تتم مزامنة بعد';
    const shortSync = s.syncId ? (s.syncId.length > 24 ? s.syncId.slice(0, 10) + '…' + s.syncId.slice(-8) : s.syncId) : '—';

    const warnHtml =
      (invalidCount > 0 ? `<div style="padding:7px 10px;background:#fff7ed;border:1px solid #fb923c;border-radius:7px;font-size:11px;color:#9a3412;margin-bottom:8px">⚠️ ${invalidCount} صورة بمسار محلي (blob) — لن تُرفع</div>` : '') +
      (sizeKB > 8000 ? `<div style="padding:7px 10px;background:#fef9c3;border:1px solid #eab308;border-radius:7px;font-size:11px;color:#713f12;margin-bottom:8px">⚠️ حجم كبير (${sizeLabel}) — قد يستغرق الرفع وقتاً</div>` : '');

    const html = `
      <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
        <div class="modal" style="max-width:520px">
          <h3 style="display:flex;align-items:center;gap:8px;margin-bottom:12px">☁️ المزامنة السحابية <span id="cloudLastSyncTimePnl" style="font-size:11px;font-weight:400;color:var(--text2);margin-right:auto"></span></h3>
          <div style="padding:10px 12px;background:#ecfeff;border:1px solid #67e8f9;border-radius:10px;margin-bottom:12px">
            <div style="font-size:12px;font-weight:600;color:#155e75;margin-bottom:6px">🔗 معرّف المزامنة</div>
            <div style="display:flex;gap:6px;align-items:center">
              <code style="flex:1;font-size:10px;background:#fff;padding:5px 8px;border-radius:6px;border:1px solid #a5f3fc;word-break:break-all;color:#155e75">${shortSync}</code>
              <button class="btn" id="copyGistBtn" onclick="_copyGistId()" style="font-size:11px;flex-shrink:0">📋</button>
            </div>
            <div style="font-size:10px;color:#155e75;margin-top:4px">استخدم نفس القيم على جهاز المالك الآخر</div>
          </div>

          <div style="padding:10px 12px;background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;margin-bottom:12px;font-size:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text2)">آخر مزامنة</span><span style="font-weight:600">${lastLabel}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">البيانات المحلية</span><span>${people.length} فرد · ${validPhotos.length} صورة · ${sizeLabel}</span></div>
          </div>

          ${warnHtml}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <button class="btn primary" onclick="closeModal();_doUpload()" style="padding:12px;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px"><span style="font-size:20px">⬆️</span><span style="font-weight:600">رفع</span><span style="font-size:10px;opacity:.7">${people.length} فرد · ${validPhotos.length} صورة</span></button>
            <button class="btn" onclick="closeModal();_doDownload(false)" style="padding:12px;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px;background:#ede9fe;border-color:#8b5cf6;color:#5b21b6"><span style="font-size:20px">⬇️</span><span style="font-weight:600">مزامنة ذكية</span><span style="font-size:10px;opacity:.7">يفحص التعارضات</span></button>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <button class="btn" onclick="closeModal();cloudRestorePrompt()" style="flex:1;font-size:12px;background:#fff7ed;border-color:#fb923c;color:#c2410c">🔄 استبدال كامل</button>
            <button class="btn" onclick="openSyncDebugPanel()" style="flex:1;font-size:12px">🔍 سجل</button>
            <button class="btn" onclick="openCloudResetPanel()" style="flex:1;font-size:12px;background:#fee2e2;border-color:#fca5a5;color:#b91c1c">🗑 ضبط</button>
          </div>

          <div class="modal-footer" style="margin-top:8px"><button class="btn" onclick="closeModal()">إغلاق</button><button class="btn" onclick="closeModal();openCloudSetup()" style="font-size:11px">⚙️ الإعدادات</button></div>
        </div>
      </div>`;
    document.getElementById('modalContainer').innerHTML = html;
    const el = document.getElementById('cloudLastSyncTimePnl');
    if (el && lastSync) {
      const d2 = new Date(lastSync), now = new Date(), dm = Math.floor((now - d2) / 60000);
      el.textContent = '☁️ ' + (dm < 1 ? 'الآن' : dm < 60 ? dm + ' دقيقة' : Math.floor(dm / 60) + ' ساعة') + ' مضت';
    }
  };

  window.openCloudResetPanel = function () {
    const s = _ftReadSettings();
    const html = `
      <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
        <div class="modal" style="max-width:420px">
          <h3>🗑 ضبط إعدادات Supabase</h3>
          <div style="font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:12px">
            سيؤدي هذا إلى حذف إعدادات Supabase المحفوظة محلياً فقط.
            لن تُحذف الملفات من Supabase.
          </div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:12px">
            URL: <code>${s.url ? s.url.slice(0, 40) + (s.url.length > 40 ? '…' : '') : '—'}</code><br>
            Bucket: <code>${s.bucket || FT_DEFAULT_BUCKET}</code><br>
            Sync ID: <code>${s.syncId || FT_DEFAULT_SYNC_ID}</code>
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="closeModal();openCloudSyncPanel()">إلغاء</button>
            <button class="btn" style="background:#dc2626;color:#fff;border-color:#dc2626" onclick="_ftResetSupabaseSettings()">تنفيذ</button>
          </div>
        </div>
      </div>`;
    document.getElementById('modalContainer').innerHTML = html;
  };

  window._ftResetSupabaseSettings = function () {
    const keys = Object.values(FT_SB_KEYS);
    keys.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
    try { if (window.CLOUD_CONFIG) window.CLOUD_CONFIG.KEY_HEX = ''; } catch (e) {}
    _cloudEnabled = false;
    _showCloudButtons(false);
    closeModal();
    _showCloudToast('✅ تم مسح إعدادات Supabase المحلية', 'success', 2500);
  };

  window.openSyncDebugPanel = function () {
    const logs = _getSyncLog();
    const s = _ftReadSettings();
    const hashes = _getSyncedHashes();
    const unsynced = (people || []).filter((p) => p.photo && _ftStoredPhotoSize(hashes[p.id]) !== p.photo.length).length;
    const invalid = (people || []).filter((p) => p.photo && !_isValidPhoto(p.photo)).length;
    const logHtml = logs.length ? logs.map((l) => {
      const icon = l.level === 'ok' ? '✅' : l.level === 'error' ? '❌' : l.level === 'warn' ? '⚠️' : 'ℹ️';
      const t = new Date(l.ts).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      return '<div style="display:flex;gap:6px;padding:4px 0;border-bottom:1px solid var(--card-border);font-size:11px"><span style="color:var(--text2);white-space:nowrap">'+t+'</span><span>'+icon+' '+l.msg+(l.detail?' — <span style="color:var(--text2)">'+l.detail+'</span>':'')+'</span></div>';
    }).join('') : '<div style="color:var(--text2);text-align:center;padding:20px;font-size:12px">لا يوجد سجل</div>';

    const html = `
      <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
        <div class="modal" style="max-width:560px;width:min(560px,96vw)">
          <h3>🔍 تشخيص المزامنة والصور</h3>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
            ${[
              ['👥', (people || []).length, 'الأفراد', ''],
              ['📷', (people || []).filter((p) => _isValidPhoto(p.photo)).length, 'صور صالحة', ''],
              ['📤', unsynced, 'غير مزامنة', unsynced > 0 ? '#dc2626' : '#15803d'],
              ['⚠️', invalid, 'صور blob', invalid > 0 ? '#92400e' : '#15803d'],
              ['🕐', _getLastSync() ? new Date(_getLastSync()).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' }) : '—', 'آخر مزامنة', '']
            ].map(([ic, v, lbl, col]) => '<div style="background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:7px;padding:7px;text-align:center"><div style="font-size:10px;color:var(--text2)">'+lbl+'</div><div style="font-size:15px;font-weight:700;color:'+(col||'var(--text)')+'">'+v+'</div></div>').join('')}
          </div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:8px">Supabase: <code style="font-family:monospace">${s.bucket || FT_DEFAULT_BUCKET} / ${s.syncId || FT_DEFAULT_SYNC_ID}</code></div>
          <div style="font-size:12px;font-weight:600;margin-bottom:5px">سجل العمليات</div>
          <div style="max-height:38vh;overflow-y:auto;border:1px solid var(--card-border);border-radius:8px;padding:6px 10px">${logHtml}</div>
          <div class="modal-footer" style="margin-top:10px;position:relative;z-index:1"><button class="btn" onclick="_clearSyncLog();openSyncDebugPanel()" style="font-size:11px">🗑 مسح</button><button class="btn" onclick="closeModal();openCloudSyncPanel()">رجوع</button></div>
        </div>
      </div>`;
    document.getElementById('modalContainer').innerHTML = html;
  };

  window._showCloudButtons = function (show) {
    const b1 = document.getElementById('cloudSyncBtn');
    const b2 = document.getElementById('cloudRestoreBtn');
    const b3 = document.getElementById('exportFamilyBtn');
    const b4 = document.getElementById('familyUploadSetupBtn');
    const b5 = document.getElementById('familyUpdatesBtn');
    const bUp = document.getElementById('cloudUploadBtn');
    const bDn = document.getElementById('cloudDownloadBtn');
    const bTime = document.getElementById('cloudLastSyncTime');
    if (bUp) bUp.style.display = show ? '' : 'none';
    if (bDn) bDn.style.display = show ? '' : 'none';
    if (bTime) { bTime.style.display = show ? 'inline' : 'none'; if (show) _updateLastSyncUI(_getLastSync()); }
    if (b1) b1.style.display = show ? '' : 'none';
    if (b2) b2.style.display = show ? '' : 'none';
    if (b3) b3.style.display = show ? '' : 'none';
    if (b4) b4.style.display = show ? '' : 'none';
    if (b5) b5.style.display = show ? '' : 'none';
  };

  const initSettings = _ftReadSettings();
  if (initSettings.url && initSettings.anonKey && initSettings.bucket && initSettings.syncId && _ftEnsureHexKey(initSettings.keyHex)) {
    _cloudEnabled = true;
    _showCloudButtons(true);
    try { if (window.CLOUD_CONFIG) window.CLOUD_CONFIG.KEY_HEX = initSettings.keyHex; } catch (e) {}
  }

  // Expose internal helpers so Family Updates module can reuse the same client
  window._ftGetSupabaseClient = _ftGetSupabaseClient;
  window._ftReadSettings      = _ftReadSettings;
  window._ftSettingsReady     = _ftSettingsReady;
})();
