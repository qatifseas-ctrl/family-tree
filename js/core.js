const FATIHA_IMG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAEYARgDASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAAAAECBAUGAwcI/8QASRAAAQMDAwEFBgIGBQoGAwAAAQIDBAAFEQYSITETQVFhcQcUIjKBkVKhFSNCscHRFiQzcpM0Q0RTVWKCkpTwFyVUg7LhdKPT/8QAGQEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/8QAKhEAAgIBBAICAgIBBQAAAAAAAAECEQMSEyExMkEEIlFhcYGRBRRCobH/2gAMAwEAAhEDEQA/APcaKKKAKKKKAKKKKAKKKKAKKKKAKKKKAKKKKAKKKKAKashIyogAdSadWF17cZMa4w46lLREWhRJHQq461zy5NuDkahHXKjZJmRVKCUyGio9wWM13HPNeZw0k4UCcE5BBrVWWS+jajJUjwPdXzsf+ppyqUaOssNK0zR0UgOQDS19U4BRRRQBRRRQCKUEJKlEBIGSSelcGJsaQSI77TpHUIWDj7VFvrLr0MBtCnAhxK1tp5K0jux34ODjvxiqexxZhmNuvqeX2TSficS4PiCClQ+NIxuUdxx4DgYoDQIuMNxbqG5TClNAlxKXUkoA6554rup1CCgKUkFZwkE/McZ48eAa8+MCb7gqFFhynUpt8hnZKiJS5FJbICEujAcyrA6HPUnjm4cYu0OapEb32RHQ4lxO9YUTlh3cApXT4w35Anw4oDTyJDMZouyHW2mwQCtxQSBnzNNZmRnwksSGnErJCShwEKI64x4Vhkx7vOZMcomFHvEJ5pclpawghZ7Q/rDk4wMj4R3gVZL0263dYSy++sOyHXpTsdIZCf1QQkDbynoOQck99Aa6kBBGQRisUwb6UMe8/pD34IjBjAIaI47Uu4+HPzZ3d2NvNcUR7jEjOR0JvCUoRI927IrJMgurKSo96dpQRu+H5s0BvKK5Ru17Bvt9va7Rv29N2OceWaKA60UVykPBhpTiu7uqN0DrRVAu8v7jtCQO4YpW7u8SArr4gCuW/E3tsvqKpxPkc5UPsKPf3/xfkKb8RoZcUVTe/SPxD7Cj35/8Y+1N+I0MuaKpvfX/AMY+1Hvr/wCKpvxGhlxRmqf3178VL769+Km/EaGW+aQkAZJwKqPfXvxUx2S84kpKyAab8RoZaqltDoSfSmiY0TzkVnn1SWkFYe3Ad1QhcnMjKzjvxV3ojQzapUlSQpJyDWX9oMyOzaUsLbQ4++cNBXVPioenFUV81ZMaK4NmWAtCfieUM8nuA8ao7MbhfLq0bm6466jAwsfKK8vyPmRUGl2dseB3qZprFZ32ozT63E/Hj4K2TEVLaQDjA8B1qpeXtlMsNcBsZOKle9ujv/OvH8JY5258sZNTLYYHFFVPvjvj+dHvbv4j9zX1t1HHQy2zRmqj3t3xP3NHvbvifuabyGhlvmjNVHvbvifvR7274n7mm8hoZb0YFVHvbvifuaPe3fE/c03kNDLbA8BS4FVHvbvifuaPe3fxH7mm8hoZb4FGBVR7474/nR7474/nTeQ0Mt8CjAqo98d8fzrrFkvOPJSpXGaqypsaGWdFFFdTAVFuJAiObvCpVQrmoGKtAI3YzjNZn4sq7M1Sp5IxT+wXnoK6ts7fizyK8NHpOqcgCnGkBPeKTdjqKpkdRSbgelANSgLRRRQBS0lFKAYoooqUCBeZS47A2J4XwVY6VQKe+la1xCXEFDiQpJ6g1XuWSEtW4IUnyCuK0nRDCPpchXNyWlHaMOn4x3g1rbJMtzxSsLLa8ftDB+9Q5DLFtuTjclousqRuaz41eQ7RFZispcYR22Ny1Djk15s/xFkuSZ0WX0y1ZabUStspyeqs8mmOEbztORXNCQ2nanIHhmlrGD4207sy3YuaM0Un1r1WyDs0UlN2/FnP0pqYH0UlGauoC0UmaM1dSILRSdKUGloBS0maKtgWpMAZfT5Go1Srd/bVqPkiPotaKKK9hxOcglLDik/MEkj1xWTg9s7JecUSodmdxOSa16hkYPQ1kkf1a4PNoGc5T17qzPxZV2ScnFLnFcEvpKeeFeFdd2SABnx8q8R6B1FFJVAoopKM8ZoBaKQHNLUAuaM0lFCC5ozSUUKOoptLQhwlwmZamlPDJaWFJ/kfKpBUSok9TTc0tX1QrkUGlpqSPGhakoGVqCRkDJOOT0qUBaKKDzUoBRmgJA6UUAtFcw80XzHDie2CA4W88hJOM48Mgin0oC0VzbdS4lK21JWhQBSoHIIPeKfUoC0UlFKAtFJmlpQFzUu2/wCUfSodTbZ/bH+7W8d60Zl0WlFFFe44hWTvqDFugdIIQs54H0rWVV6gY7WApYxlv4vpUatBdmfFPbcKDx08K5g5Sk+IBpa+f0esmocSroeadmoYO0AjO6l7VeSc9aqZKJZIHBOCelNSCkYUrdUTcTySTTw4rOc59aEog6rF4/QUlGnlMpuChhBdVjA79vdu8M8V5foeF7RI/wCkIsFxyK22lRKbinKS4fwZz8R65HHjXrjjucdoQMnA9aktLTsCQa6RnSqjLj7PFdD27XUfVbrCnJcMKX2s5yUne2sZ688KUe7B+uK9uo64HPkKQEHoQcHHBzSUtQiqCiisvqjXti0zJESc487KwCpmOgKKAem7JAHp1qJN9Fbo1NFZSze0TTF3Oxq4pjOno3LHZE+hPw/nWoaWl5AW0pLiT0Ug7h9xRxa7FpmZ9orGopWn3I+mQguOZD4CsOqb8Ed2T39+OlYHS8T2jq0zNjwnVsMt/q2WpY2vcfMGlK+Xw548K9nIPeDSVqM6VUZcbdnkXsng6wjXR1iS5IiWuOs+8My2yd6z3IB6E9SRx61de0rUD8TUmmbS1lDLkxqS8rPzYc2pHoOT9q1ETVlsl6olaebcPvkZAOSfhWcZUkeaeM/Xwrz724f1e96emDjAUM/3VpP8a2vtLlEfC4PX8YJHgag3y6MWW0yblKS6pmOjepLSdyj6fz6Cpm/cdw6HkUi0haFIWApKgQQRkEedcfZs8v0d7VHbvflW+5wihEpzEQx0lZb/AN1XeR37u706eojPjXnV0uei/Z1cH3IUEKuj4G5hg5LaT3ZPCAfAc/Stlpu9xtQ2aPdIYUlt4HKFdUKBwUn61uaXaXBmL9M8X1BrC9WT2l3K4BJSptZj+7O/KtgfKPrwoEd5zW7v2u2pfs1kXmG09FdlExG0udQ4eFFJ7wBu58qyHt3iJb1Fb5QGA/E2qPiUqP8AAitP7UrTGiezSPHht7GILjBQPIgpJ9TuyfWuv1elmeeTT+zqX77oezO5yUxg0T5oJT/CtHmsD7FX+10Q2gnPYynUeg4V/Gt6a4TVSZuPKFzRTaM4rJodRSZNGaUQWp9rH6wnyP76rwasLX859DWsfkjMuizooor2nEKjz0qXCfSnGSggZqRTHSEtqJ6AUBimVb2kqxjjGPCugroI6UJwHQc5Vz51y6V8+XDZ6l0Oopopc1ko6ikBpaoKDUcnsr1ppjdgPT15HjhpWPzUK0APhWC9rMh63RbJdo4yqFPC8eORnH124+tM1D7TbOiwuOWeQpye8ja00UEFkkdVZGOPLOTXXQ5JUY1JN2V+vNX3W73Q6X0mHnFglEhyP87iu9IPckd57/Ss77ML09pnWBgXRTjDMkmO+h0kdm5n4VEeOeM+Bre+yjTps9mE6UjE+4ALUVfMhvqlP16n1HhVD7atKyHJTeoIEdTiCgNyw2nJSR8qzjuI4J8hXWMo+CMNPyPXnCtDalJQVLAJCfE9wrxKR7KNU3WS/Ony4CJMhZcWFOKUck56hOKwzepb602ltq83BCEjCUiSvAH3p41PqFfwi93E54x7yvn861HG49My5JljqnQd40xGEi4rhloq2js5A3KPkk4J+gqptMe+ODdaGbgoZ6xUr6/8Nei6A9ncq7vpu+rkvljgtR31He75rzyE+XU+nXEXN2/aUucu1tT50INuq+Bp5SErGeFAA4wRjmtKV8GaPS/ZLadRmdIuGoH7ohplHZsR5bjgC1K6q2q7gPzPlXqOD3Zr5Z/pVqH/AG5cf+qX/Oj+lOof9uXH/ql/zrEsTk7s2pUi61PCm6K16Hg844pD6ZbL6vmcQVZ58+oNbn29MhdntMpI4TIWj03IBH/xrzjTyLhq3VFshTpciWVOgKU84VlDYO5XXoMA17f7TLE/qDScmPEbC5LK0vstjqopzlI8yCcVZOpRsiVpl3p6c3dLHAnMKC0PR0HI8cAEeoOapfaNqr+ithLzODOkEtxgRwDjlR9B+ZFfPkW63a0748SfMh4V8bbbqm+fMZ61zn3a43LZ+kZ0iV2ednbule3PXGaixc2XXxRu7h7OH1aSd1NKvbT0pxoSiDyhYPJHaE8r58OvFb72NNON6FjqWCA5IdWjj9nIGfuDXgC5D6mEMKecLKTlLZWdoPiB0qbG1FeorCGIt2nMstjCG25CkpSPIA1uUW1VmU6dnqXt+jZh2eVg/C460fqEn+BrWa1Z9+9m07xMBDw/4QlX8K8ERMvGopcW3SZ8uWXXkpbQ66pYCicZwT519Lz4KF2KTbkcoMRbCc+GwpFcprSoo0ubMH7B3CrTdwb7kTcj6oT/ACr0ysR7ILO7adHNrkJKHprhkFJHISQAn8hn61tq55PJm49C0UlFZNC0UlFAOHWrC1/MfQ1XCrK1fMR5GtQ8kZn0WVFFFew4BSKGQR40tIelAZCU2tp1TbhypBKd3iK5VJmumQ+pSE8bj9PKuKmlITlVfPyeTPVDpDKWkorBoUUtJRmhKKzU1lZ1DZJFtfVs7UAocxnYscpP/fdmvOtNeyqWxdkPXx6MuIyrcG2VFReI6A5AwPH7V6mzLYeffYacCnY5SHUj9gqGQD9K7V0WSUVSMuKbscgZIHSpY4GK4MpBGTzTJ1yg24NGfMYjB5YbbLqwncrwGaitlYLtducUVLt8NSj1JjoJP5U5m3QWFb2IUZtX4kMpSfuBXONd7dKmvQo06M7KZx2jKHAVJz5fyqQxJZkIWthxLiULU2opPRSThQ+hq8meDoFpKsA5NcpEOLK2+9RmH9vTtW0rx6ZFMjyIz8mS0w4lbsdQQ8kfsKI3AHzwRUgqA6mheyJ+h7X/ALNhf9Mj+VH6Itn+zIP/AEyP5VLyDyKWlslEdiDEjKKosSOysjBU00lJI+gqR3VHiT4sx6UzGeS45Fd7J5KTyhWAcH706NJYmN9rHdDjYWpG5PTKSUkfQgiq7KqGv2+FIXvkQ4zy/wATjKVH7kVz/RNsHItsLP8A+Mj+VSGJDMjtOwcSvs3FNLwflWOo9RXWltEpEVyBCeSlL0KMsJ+UKZScenFM/RFr/wBmQv8Ap0fyp0i5wI0xqHImx2pLqSptpxwJUoDqRmm2662+6JWq3TY8oNqKV9k4FbSPGnI4Hs2+BGcDjEKK04Oi22UpI+oFSe6mqBPQUqQQOalihQMAADpSKzTqi3C4Qrc225cJTMZDiw2hTqwkKUeg5p2DuM06oTN3tr85yAxPiuS2wCtlLoKgD5d/0qYadDsXNFM76XmllHjrVjavnPoaq8mrK1fOfQ1vH5IzPotaKKK9hwCmOHahRAzgZxT6Q9KAycYksJUfmWSo+pNPWgL659Kdt2/DjBSSkjvFIa+dPyZ6Y9IiqQdxCeQO+m4PgamCqS6XQKv8Kwx17HX2lyJCwcFLKe4eajxnuAJ8KiVmm6J/NHSs3rvVzmmEMiJa1zXHBucJCg20gcDKgOp8PKslG9q10eZU9G06y8hKtqi264raT0zgd+D9jW44pNWjLmlwzQ6JC2tV6vikkkTEOj0UFf8A1V9qHUFu06y2u5LcLruexjso3uO464Hh515nH1Hqi0XiRqZdgJYu6QlTOxeE7OBz1B47+uaqpesdROatGookBxh4NBnsC2taCgDlPIzyefWu21qlbMa6XB7FprVls1ApTMZL8aUhO5UaU3sXt8R+IenSl1darBNgGbqOM24xCSXO0USCkd44PIPAx31ktN6/vt/vMOCvTjCFKUSuQ4XAGk4+JQyOOO7PPFWXtPudxtZssiHbjOityVOvtFJKVKA+AKx5kkeYFY0tTSXBdVoTQD+jLvcXrhp+AiHctuFsrG1TaTwVIGcAHPJFSfZUs/0afYWoqXHuEhCs8n5gf4mqD2d2iXO1XJ1PIsws8fsilphAUkOLVwVAHux5AZIqC/e77oLUF5is2czIE2WqSwopXj4vBSR9CPKtyV2kZTpJs1OgMs6i1jEUSSi5B3k54UFY/dW0LaVHJ614rG1JqmyXeVqR2wZYvQCiyULwkoO0cjkHjPPUGu872g6sU/Bu36E7CChbjSGSlza84U9/ecDkd3X6JY3J2VSSPXJ06HbIxkT5LUZhPVx1QSKrLLrCwXyaqHa7k29ISNwQUKSVAdSnIGa8aTqeXKlqm6g04q8SiTsMouBppPghsDA/OuCb24zqeHe4WlUQzGO73eOHUocVg4J44692M1VhJrNra7IYvteuwiyH2EiMqWhKFn41OAcK8UhSiceQq59jEhx7SRaeJK4811Bz15wr95NVugrlP1JrmVfJVtMFtqAI6k/FhZ3gjlQHOAftWg9nlnfs8e8pfSUJfujy2QeMoBwD6HFSb4p/osVzaOPsucV+jbxHWoqXHu8hJJOTyQf51bztUQoupINgAU5MlAqVs6MjaSN3mccD615/c71e9BapvXYWn3y23B/3ptSkqCQT1wpP1BB8BWSg68uMS7M3ORBZe/rD0rBBT2ri0lGSrvCUnaAOBV29TsmquD2u96c07MlC8XiFGW5HRuU88cJ2gftjoQB41Tez2bpF6bdI+k4q2VJIW64tJw4knA2kknaD3cdawOp9dXzUUaNENhLLKH0uuMhDi0yMdEKGPl8q5WXWNws17uFzZ0sy2uWhDfYMtONIbCfAAdTxn0osctNMalZ73TT1zXjMzXOr50mJeWLG41AgOELZShwocUtJHxd5wM47gfWuk/2kaqnxFJhaedjNpUO2eZQ6pQTnoFY+HPTPWsbUi60ex58aq77p606hZbau8NMgNnLaiSlSfHBHjjmvMpHtD1U9KhzRpt9uC0pQLKEO7XlEYGVYzxngePjSI11qyxTpxumnlurmOJfQlYcAaSUgBCSARgDH1zmqsckNSNmzA0fZtaR2I0KPHvMlhSmkoHwpHkOiVEA9ByAfrrq8Vbu1w1trWwvGyG3vxXwpclG/ltJ3fESO7Bx64r2r8qmRVVli7ACloFFczQYqwtX9sR3bTVfU61H9ef7tax+SMy6LeiiivacAooooChvLQanIdHR1OD6jpUOrq9NhcQFIBdCx2fmrwqmPBI868XyI1KzvidqgrAa+0dd7leY1+05NDE9hsNlKnNh4JwUq6d+CDW+zig81yjNxdo6NWeZRontVkp7B+fEiNnhTquyKsf8ACCa12jtOMaXtzjAf7eVIc7WTII29oryHcB/Grd105wngCuVWWVvgiglyTQ4CeFHPrTtyvxH71ABx0rs2sq+FZz4VjUaokFR7yfvRk93FJjjvxXCNNjSnX2oz6HFx17HUpOdivA1eTLq6JGecnk0u444JH1pueKrpl9tcKI1KkTGww6opbWjKt2OuMdw8elVW+iNqPZZ7j13HJ86YptC3UOrTucbzsUeqc8HH0pQQQCDkHoaM84z16CllHb1fiP3oyfE/ekOEglRwAMkmmNPNPtpdYdQ42r5VIUFA+hFLB0z4k/WgGqGffJ8a6uwYtlclBtpDgeD6UJwrjnPTkEVY20Ty2ty5qZS6s5DLPKWh4bjyo+J+1acWlbMLInLSiatIcbW2sZQsFKknoQRg15iv2XTUvG3sXoHT63w8qK6glaMHPw9wOOMgjPfXocW5QpcqTFjSEOPxVBLyBnKD/wB+FSVOoQtCVLSlThIQknlRAycePFWMpQL9Zcj0/DgJyAOAM0oUc8qP3qLNmx4LXaynQ2jOBnkqPgAOSfIV1Zd7RpCyhbZWndsWMKHqKzz2W10UGnWNVtXq5OX2bEet61f1ZDQO4eGPwjHUHOTWk3kHqfvWd1hqJywMMFhhtxx3ccvKKUAJxxkftHPAq9SrchKiMFQBxnpWpXWpmYyi5OK7Q/tDnO5WfWnAnHBP3riK6JPFYs2OyfE/eikz5UZq2BaKVCd5wKbVAtTbSf6yf7tQqm2n/KT/AHa3j8kZl0XNFFFe084UUUUBCumexbCepdHT0NUWavbodrTROcdqM4+tUROST4mvJ8jtHbEJS91GKOleY6kNadqiKSpS0BXr41yLB7jmlFs5U9oErGO6nBg95FMmym7fG7VSSoqWltCR1WtRwB/350SbDkkrZR3+BMg3RzUkeers4zA3RFHCVgdRnOORz0znFS7U3bbHHiALT21yWhJcSrIdd2k5z58/cU/UTa5jkO2ZaS1KUsrW40HB8A3ABJ4yevPhWb1dp5Nr0kwILzyzAkdslSzykKODjHQA4OPWvTGppRbPFO4SlKK6/wDTXzLf7+8UzHVLhgDEZPwhR7ys9VDy6eOaotVw4VyShsrVDjQUqD81HwoaQcZbSOiyeOOg9eKa/qaYYEF5lpIMyGVMqCd6nZAKfgA7uN3X+FVeq5z8rSq3XVqCFXEuNMyx2bjrIOQNvXAJP0FXHCakiZssHBmps+pLPdXBGgzAp5I4bWgoUoDvAPX6VzNx7LV5iPNPK3x20sbUHbglSnFE9OMJH2rzSQ1Hu0plWl7TOZkJwVhDm5KVf7v4ee8n6V61GdejRIDE1fay3AltZH7SgnKj9MGmXHHG7XsYcs8vD9e/RmXIF6hSZEWbPVKh3V/sUHccsgnJ69Mo3jA7wKg6uQ9pp+wN2cOBllxxSGASd6ioEjzyFEVe6jtn9IparcVtNJjNJcLi0qUoFZPKQCBxt6nPWq/XUdUK1WR0ureVCltpLq/mVx1P2qwkm437MZYNRlXr3/ZJ1tLL+ilzISylt7slbu/aVDj74q709cTdLNFmLSUuLRhwEYwscK/MVG1qwJGlbo2AOGSsAeRB/hTYbTV20nCEh1TbDkdtTxQrbuSB8QJ7gcc1z4eP+zurWVu/RBRLU5fZpsEVuQ72aGC+TiO1glSiVD5lZV0HhVnBs6Ij6rjcZK5k5KDl9wYS0nHIQnokfnWZje0O0xZCIce3rbgNnYhxsgYT47PD862x7GfCUELC2JDZAWk9UqHUfemTVGrVImJwnbTtoqHEpudndutpdcVIkNb2XDgrSkf5tGflzgj1NR7RFur15RNlRBGigvuNhb250B3b+rUkcDBGaotG3GRarZfra4Cp63BbrafuDx6gH61tYc+M5a25gkp922f5Q4doOON2T5itSuHBMbjkqT4ZnrlqGzvXhUK7zG/d2HMBgNlbalj9pxWMcfhHAPUmtYyttxpC2FIW0pIKFIIII7sYrxVmRbTDfhP2xUueXVdjKjOkFeT3jndz5dK3GhY1xsdknP3ZLrUdI7RlhZ5TgHJx3Z4GK3lxKMbOPx/kSlNprj8m1NGaakqKRvACsfEB3HvFLXkPoi0opKKAcnPdTti1nISeaRpO9aR96n4xwK0jLdEFSVJPxAiplpP9YPpSrSFJINNtmBKwM/Wtw8kZbtF1RRRXuOAUUUUBWXtYS0yNpJLo9Bwap6v7q2lyGoq6IIVj0qhVgKIByO415fkLlHbG+ABo4NJRXmOovFHFJRQC8Vnb6+lzVNggrUEo3OSCCfmUlJCR981oh1rL6ps8fUF3hQVuKZcZZW+p5AyoJJCQn6nJ+ldMVauTjnvRwWMh9qem3y4Z7VLM/ZuHePiQrHlzU65REzrdJiLGQ80pH3HH50lrt0e1wGYUQENNDA3HJJ6knzNR77fYdjih6Urc4r+yYRyt1XgB/Gnckoh8Rbn7MBD1S7Z9FxY0co9+94daSpYB7NIOSQD3/FgVVW262QvGZqBqfcpij8W9xOz9+T+7yrWaFYbZlXiBdWWPeG1pkFLiAdgUnKuvcMjNcpE2bqB1TWmLLERFSSn359hICvMZGP3n0r26kpNV/dnzdEnFSv8AqrC2a8sdviIixoEttlGcABHeSfHzpLlrGzXdcVssXRC23coLBSkqJ+EpPPQ5xSW7QCZct9y7XBTqm1hK0x0BAKtoJGcdBkdBVjamtIwZsxuHHT73bkqccW6CpXw9Sknrg8cVzksV3FNs6x36Sk0kXziFJ1G06EnDsNaF+RSsEf8AyNVntEaLuk5ah1aUhwfRQ/nVpYp0u4QBInQlQ3t6k9krk7QeDXHVqEL0xdA4QE+7KOT+VeeLqas9kknilXsrFXOPNnS4LzmHXoDbcdrHKwttS1L9M4GfIU3TDS7n7PGoiHNji47jAV4HJFXWn2NlntqpDSRITFbSVFI3AYHGetZzTsxdp0ZcHEAFyNKebaChxuKwE/ma23aaj6aOKVNOXtMy0iw6segtQnrapTEf5AlDWR6KHJ/jW19nLsgWNyDMbW29DfU1scGFJSQFAY+ppmoNXtW/FvtoE+6nCMNjKUr7846nyH1qdp2K9Z7S/Lvcoe9PrL8pxxXCOMAZ8gMcfSt5ZSljqS/g54ccIZbg/wCSlmPtWLXk2WsYakW5byh4qSMn/wCP51jJmof0zPDt+W+uKnlEWKpKEp8uf39a0dxvAuGorbfW2Si2MSRDS46P7UHJUrHhzV7qK8pizharNamZtzKQpQ7FJS0D0J4/+q6RemrXNHKa1p1Klf8AmzOWzV2nrbJD9vsz7Cw12R2LScjOck5zmrKZ7QbPNiOxX7fNW26gpWAUjg+eaROjLrdiHNQXJttOdwYitJwn7AD99XEPQtgjAFcZchXi+4SPsMCsTlgu3yzeOHyapUl/BM0jMjzrGy5DYkNMJUpCfeFblrIPKie/JJ59auaZHZajMoYjtpaaQNqEIGAkeVPPWvHKm20fRgmopPsKWkpM1DZ2ZKUnco8DuqQiQhRAAOTUKlIIOCKJtEcUyQ8+VIwkYz15rrbFYkpHXP8AKoSlE4GeB0FS7aT702McZ8PKtwf3RmS4L6iiivonmCiiigOb6O0ZWj8ScVl0J2JCD1R8J9RWrPTiszJG1wgqBIUrdjxzXDOuLOmN8nOikzSH1ryHYdRSA0tAGQOtYu/3pOndXiZJZcdiyoQa/V9UlKieM9ev51s64TIMSe0GpsZp9sHIS4nODXTHJRfPRzywlKP1dMxcjXsm4r9105a3XH1ftujdt/4Rx9ScV3t9getyxetQO++XZxxDbKFHclpSlAD1IznjgY4rXxYkaG32cRhphv8AC2gJH5Vxu1vbucJUZx11n4krQ60rC0KScgg1vdiuIqkcdib+03b/AOjK68sM52QbvZt5e7ItSG2z8S0YxkDv4yCPSo2g9WOvuR7HNY3KSkoZdQMEBIzhQ9B1rdRWERYzUdoqKGkhIKjknHeT41z9wh++Jm+6s+9JBAeCBuwevNXdWjS1Y/28lk3IOvyjNR9Rs2jUt0tt2UWW3nw8w8ofDhSQMHy46+tWU212icpMthyI26XkuuvtqTl1I6pJz0I4qRfdPW6+tpTOaPaI+R1s7Vp8s948jWbHsytu/JnyinwCEA/eieN83TMyjlX1pNFxeNZWe2JUBIEuR3NRyFc+Z6CqPE+8vsXDUyVxreHAYlsaSSuQvqMp6nx5/IVobTpa02b9ZCiJXIA+F187lZ8uOPoK43O0Xq6ODtLuzDbTkBMRgleD1+NRzz5YpFwXC/yJxyyVy/whkzUaLW8qTeJDcYbCGra1hx08j4lkcA8dOg8TWHmSL1d7POXDiKZtCXlylnHKyVZ6/tY8uOK2lr0LaILgdkByc7nO6QeM+O0dfrmtOEpCQkJG0DG3HGPDFVZIQdxVkeDJkX3dI8qsOo7LYmAbdbJMi4rThTryk8nwGM4HoOasfdLlqKY25qZ8xIiSFpgtfCoJ/EofsjzVye4VumbXBjb1Q4rEZxQI7RltKVDzBxXKDaWYxDjmHHAdw4+FJ8R4q/3jk+nSks0XbS5JH406UW+CFcrPDvNjkWmOhLDTC9jJSPhQtIz9ucH615/AvN40hdXk3BlTnabQ6h0/2gSMApX38dK9Qg21EOZLkIkPrEhZX2S1ZQ2Scq2jzPNSpEePKbLUllt5B/ZcQFD86zHKo2nymbn8dzqSdNDYj6ZURiQlJSl5tKwlXUAjODXWhICUhKQAkDAAHQU6vOz1pcDaKdSEUKJRS4oIoBKUUlLQD0Y3gqGRnmrOOpJWgpIwDVSM544q0jAJAx4fetQ7MS6LaigUV9E84UUUUAGszOCUvr2px+sVnz5rTVnrwjZKKcj4huAHcO/8645/A3j8iFmikwaRag2kqWQlKRkqJwAPM14jvY7NG6uUeQzJZS9GdQ80r5VtqCknu4Iqhm6ilvvuRdNW03F1tRQ5IWvs47ah1G/9ojwTWlFthujSZozVTY2rw0047f5Udx9Z+FqM3taaHkTyo+ZqzC0KztUDjrg5o1TCZ0zSZrIx3bvfGdRQ41zMCVHuRaZeS2FbGwlJAx3Z5yfWptqh3KJfnk3DUgmpcjpWiEWEIKccFeB0GfDrnmtONeyWaKlriXWw6GS4jtSncEbhuI8cdcU9SwlJUogADJJPAFYND6TNR3JsdqIuW4+0mMhBWp3eNoSO/PTFJCnRrhDblwHm32HE5Q4g5CqtMhJ76WsZaLlqK66IgTLSuIq5rcUHlSvlIDigrGPoPTzqdcr04JemTFkMuRZ0wtvLYVlLmEKwAfDd9eK1ofRLNLmgVjrnadQMMTJK9Ze6sCQH0rXFQEtN96SfDy6Hv61rd6WGN7zydqE5U6shI9T3Co410WzpRSJUFAFJBBGQQeDTQ80XiyHEF0DcWwobgPHHXFQD6Md9ZaV7QtLxLi9BkXLY8ysoWexUUBQ6jcBVtaNRWi9OON2qe1KW2kKWG8/CDxzkVXBrtEtFnRUSJdYE2VJixJbLz8VQS+2hWS2fOpKXWluLbS4hS28b0gglORkZHdmpRbHUtJmioUWis9Jnym9eQLeXMQ3bc84ED9pwLHJ9AOPU1bXO6QLTH94ucxmK0TgKdVjJ8B4n0q6SWS6KjwpsW4RkSYMhqQwv5XGlBSTXepRbHgbs+XWpEV5YUEAZFRQT0ycV0YUpLqSk4ouyNGlHSikbOUJPiKK+ijyjqKKKoCqa9t/1llzjKklH8f4Vc1V3dC1vsYA2oBUT+X8axk5izUeyp215v7RrfdtR3V6z2534YUJuWIe7b70pSyDk57gOnia9QKKqTZydUIvAUkJEAxVJ7ye0CgfoM/evLCouzq+TyjTF61Rp+2yIDekZb8QvudmgBwFkn5k5AJxzwT9zVAq0ywT2Gj7+ynPyofcwP/119E7MeNGzzre57omj9nzt+ipyhh3SeoXB4Kfc/wD51Js9pvrV+t7llsd2tS+2SFuPrWpvbnndlI4xnNe/lJpNpxzR5n+Bo/Z5reJeoNL6nuki2WF26Qbmpt4FsK+BYTgj4QcfXyqLY3L1f9fQLvKsEm0pjsLQ+45v2upwQlPxAc5P/eK9T21wlx1vtFDch1hR6ONbcj/mBFY18dF0/s8V1c7fLXrYXZVsle8JnARZAUS281jCWkgDHIz355PFXl2d1lrK2uNt2dFsjsLClRpKlAyz+HnHA8OAfHitZD0aEXxu73S7zro9Hz7siRtCGj+IBPGfoK0u2tSyJVSIo9nmkfT1+b9m0S1iKw7LRK7ZcJ9zCVNbirYo5Hfg4zVj7I23Y9hmIWW1NC4L7PsjlHRO4JPenOQD5Vd33TC7y0tl2+XRmOv52WVoCVDwztzj61ZWu1x7VBYgwmw1GYTtQkcn1J7yetZlP60VR5POmLnqTSwm2ROl3rnB7d1TLzQXhTayTjKQfH1FcrbY73G0JFfiQXUzoV19+iwnc70tjjbg4J7z516rt8KTbTd/Q0HlF/1NqK+WeTbJWiJiW30Y3JDuUqHII+HuOOKsdXW+8jQ9it/uEm4BpCBPYYWQs4R8IOATgE+B5SK9FKSazt901Lu6VNHUVyjxl8LZbCMEd4yAD981Y5Fa4oOJhtFao1UmxxbVbbE5KSFKaZnO7uzbGf2uMEJ9e6rLRml9R2vW6pt0S0toMuB2ahefeSo5HnuzjqBgCt/a4Ea1W9iBBb7OOwjahOc/U+JJ5zUvNR5e6QUfyYaNpqz6musx9+HHRboEpcZqOwgILzicb3HFD4jycAZ7s99amFZoFpjSEWWHHhrdQeW0YyoA7SfHBNZObpXUdvvk24aUvDEdia4XXo0lJKQs9TjBB7+eD3VYw7RquQCbvqZLIKcdnboyUnPjuUP3CrJp/wDLgLj0ZXQdruVq122zOjxo76YDgkIjuFe9ORtWs5PxKV6dM4q/nxkQfafb5NvmLMi4NL9/iZyA2lHwr8uQMDyyKsrXoyHbY0pMefchLlK3PTRIw8vwGcYxXXTekoGnn5Elh2RKmST+slSl7nCPDPh++rLJFuwovol2m7JulyuSGlfqbe6I5SnkrcxlSj5DOB4kHyrH3D2j3iHdRB/oq+gvOFEYSFrbU94YG3GT4Z76m3b2dok3h+6Wm9TLW/IUVPBnkEnqRgg+eOasLDo1i2zm7hPuM66zWs9k5LcJS2TwSlPcfPNRba57D1dGUlXrV866w9QNaTdaFtStpUdW/c8lwc4BAOBjuHfVbPveq5mpWrw7pGQ402x2KYciKt1AGclSSU/ConvH7q9mzRuPiaLKl6K4fsyehrlcLg9MVJ0uiyMgJKlYUgvL8kkAcDqfStdTSaXNc5O3ZpIWntH9Ymueac2fjFQppmDllv8Auj91FJH/ALBv+6P3UV9BdHkOtFFFUBUG4pG5lRJ+Yj8jU6oU07pDDY6jKzxngDH8akuirsg7KbsP0qTtpqtqUlSvlAyceFeSjpZn7xqay2WWItznIYfLKnwgoUSUDr0HXrxUuLdIEuzi7R5CVQC0Xe2IKQEAHJOeeMGquz6205cbZFlyrtbGH3GyVtOvJSprPVJCufXxqpuuo27ren9O216BMtk2zyA2qI4FqbdSk8KxwBjAArSh+hqNW7cITENmXIlNMMPbOzW8sICt2Ckc95zUkp4rCwdT6Qk6Etq77Kt8pUWK0tcRwhTgdQnGAg85yMeHPhVpevaFp23Wdc2NPjTXtgLUWO4FLUSO8D5QO892Kjg/Q1GikONRmVvPuJbaQMqWo4AFOACgFJ5BGQRWItWs2b1oK7Xe7xIrqYjqmVNIyGnvl2fNyASocnp1rtpDXtrm2pxN5lWy2S4jhaW0h9IbUkDIU3ycpxxxnpTbZdRsCiqc6js//mI9+b3W1e2UnPxIPHd3jJxkd9Zq0e1O1z7+qK+5Gi21wLSw+4pQWFpIwXMjCQoZx4Y5qm1BFttzd19LtrkaSFW+M+h9hQUAQcrGR4lAJosfNMaj1QoprhS22pbikoQkZUpRwAPEmsPr/V86w261JtzsdmXIjpkqMhBV2iQE/q0gD5iSeuOB1rYsS4txtcJchtGy5MpKWHBu3bkbikjvAGc1lw4suodEfYmR0SIjzb7DgyhxtQUlQ8iK6lFZ+Zf7DpK4QLC62i3x3mVONOBG1lHPQnxPPPpnrT5GuNMszI0U3iGsv7vjQ6kobwM/EroM9BRwfpF1FozKivvPMMSWXXmCEvNoWCpsnuUO6uxT3VmouptGRb3KaizbazJfbDz8pCkhDpzjaV9Crvx/Gqe7+02K1qKHbrUliVFW+229IJV8YUcHs8cHb3k9e6m230TUjcB1kyFRw4kvJSFlGeQD0NPKaxOq9XRdPavZaEKIoBLSJ8lawHkpXnbsGckAcnr1A4qXqf2gWa1RWxb58KZLeXsQEu7m2/8AfcKckJ8hyabTLqRfXa5QrPDMu4vpYYC0oK1dAVHA/wC/DNOYmxpElyNHeQ4420h1Ww5G1edpyPHaaxF81VZdS+zmb2s2GzOcjFRiqcAUl1JBwkHk9OD4GptqS3adXT3GmCiKdPR5AbQMABvjHl0NNrjnsmvkubtqmy2iW7FuE5LL7TPbKRsUTtz5Dr5VOVdIabSbr26fcg123a4IBR481XwNWaclwI8iRd7Yl11lPaIW6lJTkZKSDzjPdWZ1PfheRqCyRHYkqB+hzJjuxXAvapsgqCsdPIeQ8aLHforkeg5JTkd4zSJJ76yeotUu2HTFpkR2mHJsxlBQmS5sRhLYUok5HPQAd5NOc9oNkRp1Fz94aXJWyFiAhwKd345SQOmDnk93NZ25ehqRpZM2PFcjtvuBCpDoZaH4lEE4+wNdxzXl6NRSNTRLRcVsspdg6gZa/q+7atC08H4ufKrPU+s5Vr1jFt0ZTBjNOtNyWFJJdd7QZ3JOMAJBHf1q7T6Gr2bxRoFOKSCR4Gk2muRoWns/2ic+NcsGp1pYLskEj4UcmtRVtIN0i/bG1tKfAAUU+ivoo8oUUUUAVXuLK57gxhLbYT6k8/wqwquQR7zJPA+MD8qxPxKux5RxTQ33knNdKK4GzKSfZ1pCQ8t52wRS4slSikrSCfQKAFS7Lo+wWGUqVaLWzFfUgoLiSonaeo5J8K0FFW2Qy50DpT30zP0DDL5UVklJ25Pftzt/Kulp0fp6zS1ybZZ48d5SSguAE/CeoGScA1pMUhFLf5BlL7bXI9pdt9n0xBnRHQSqKZCWEEk5JKdvPPPBqi0p7MLRHgqe1DaYTs914ulptSy3HT3Np55A785616PigppbSBmbhojTNymOTJtliuvuI2LVtKcjxwCOeOvWpFs0vZLRDlRbZbGGWJQw82CSHeCMHJPGCfvV7tpCmpbBhtV2nUOoeztrdvtsOEpW12cp8PPIbPzBtO0bSRxn91Jq606iYlWido9EVw29lxgxJCsJKFBIBGcdyQOordbaaU1dQPOo2m9QaomR3teRLYmDF3qahR8lS1qTjKlA8DvwD1AqHD0mkusxX/Z5bWYj0lSZDnv+9TaE/Ksd/eeAefKvUMUhTTUxRlF+z/SZYSwbFE7NKioY3A5PXnOT0HU1ZIsdtYYiNx7ZEIg8xElAHZH/AHTgkdetWqzg4AzTtvFZts0jzTUek52q77G9/wBPwYUVC0l+f712rzraf2EhOMZ6cjgeFaaLovTcSLJix7NFSzKADySCrcB05JJH0rSFNIUUcnVDgyX/AIe6TGz/AMijEoAAOVc48eefr1rQGIz2qneyR2ikBtSsDJQOdvpyeKmFOKNtRtvsWjIuezzSbi1LVYo2ScnapYH2CsCplr0lYrR7x+jrYywJDfZPAFR3o7wck8VodtJtpbLwYTW9qud5ipt8fTkCSgcNSpEsYYyMbgkAHgY46cd9TtN6JstgbjrjwmlTmmuzXKIJUskYUcE4Gee7pWsKaaQEjKjgeJOKanVDgqU2uJEjdnBgRkhLvbpaSkNpLn4uBwfPFZyXZbxe9QRH7nBgQrdEWHVdm4HXpBScoSVbRhIODjy+2tk3OBG4elNJPgFZNVMnVUJBxHacePmMCtRUvSDaLgp5pUtLWcJSSazzVxu9xcSlhtMVCjgKxlR9M1uLPbxAiJQpanHVcrcWckmiwN9keQhsWtxzBc+AedW0aMiM3sQPU+NdcUtdoY4x6MSk2FFFFdDIUUUUAh6Vmk3iKh11t1mQhQdUSSnIPPlWmriqJHUsrUygqPU4qNWqBTi+Qz07Y/8AtGnC8RD0Ej/AV/KrlLTaeiEj6U7aB0ArG2i2UybrGPRMn/p1fypwuTBPDcj/AAFVcUVdtCyo/SDX+qkf4Kqd76juaf8A8I1a0VNtDUyq98R/qpH+EaPfU/6mR/hGrWim2hqZUe+p/wDTyT/7RppuKB/o8r/Cq5oq7aFlIbo2P9Hlf4Vc1XdoH/JpX/J/91fYFG1PgPtU20NTM8q9tD/RpH/KB/Guar81/wCkfP1SP41pOzQeqE/amGOyerSP+UVdtC2Zz9ONdfcn8/3k0G+JPSE79VprQKhRldWGz/w0xVshK6xm/tTbiLZn1XtfdBX9XBTFXx/ugD6vD+VX5s8A/wCYA9Ca5qscE9EKHoo00RFsoP03MPSA0PV4/wAqaq83A/LFjD1cJq9VYIp6LcH1zXJWnW/2JCx6gU24i2UK7rdz8rcNPqVGuap97V0eip9GzV4rTrn7EhJ9U1xXYZg+Utq+uKuiP4FsoHFXp3O+5BIPchGKjKtTj3Mmc+5481oV2icj/ME/3SDUdyLIa/tGHE+qaqSRCpbs0NGMoUsj8SqltRmGv7NpCfRNdaubLay8oSJCcNjlKT+151QSLDbezAlPj4iPgSe4eNXlA4ooAooooAooooAooooAooooAooooAooooAooooAooooAooooAooooAooooAooooAooooAooooAooooApMUUUBzMZgq3Flsq8SgZroBgYFFFALRRRQBRRRQBRRRQH//Z';
// ╔══════════════════════════════════════════════════════════════════╗
// ║  إعدادات الحفظ السحابي — للمالك فقط                             ║
// ║  CLOUD SAVE CONFIGURATION — OWNER ONLY                           ║
// ║  قم بتعبئة هذه الثلاثة قيم مرة واحدة ثم لا تشاركها مع أحد      ║
// ╚══════════════════════════════════════════════════════════════════╝
const CLOUD_CONFIG = {
  // مفتاح التشفير AES-256 — 64 حرف hex (أنشئه مرة واحدة وابقِه ثابتاً للأبد)
  // يمكن إنشاؤه بتشغيل: [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('') في console
  KEY_HEX: '',  // ← ضع مفتاحك هنا

  // GitHub Personal Access Token (صلاحية gist فقط — github.com/settings/tokens)
  GITHUB_PAT: '',  // ← ضع التوكن هنا مثلاً: 'github_pat_xxxxxx'

  // معرّف Gist (يُملأ تلقائياً بعد أول مزامنة — لا تعدّله يدوياً)
  GIST_ID: '',  // ← يُملأ تلقائياً

  // اسم الملف المشفّر في Gist (لا تغيّره بعد أول مزامنة)
  GIST_FILE: 'ft_encrypted.dat',
};
// ملف الصور المنفصل في نفس الـ Gist
const CLOUD_PHOTOS_FILE = 'ft_photos.dat';
// Gist ID يُحفظ تلقائياً في localStorage بعد أول رفع
const CLOUD_GIST_KEY = 'ft_cloud_gist_id_v1';
// ── مفتاح تمييز الجهاز المُهيَّأ (يُضبط مرة واحدة بعد أول تحميل أو حفظ حقيقي) ──
const DEVICE_INIT_KEY = 'ft_device_init_v1';
function _isNewDevice(){
  try{return !localStorage.getItem(DEVICE_INIT_KEY);}catch(e){return false;}
}
function _markDeviceInit(){
  try{localStorage.setItem(DEVICE_INIT_KEY,'1');}catch(e){}
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  إعدادات رفع نسخة العائلة الصامت                                 ║
// ║  يُملأ بواسطة المالك ويُضمَّن تلقائياً في نسخة العائلة           ║
// ╚══════════════════════════════════════════════════════════════════╝
const FAMILY_UPLOAD_CONFIG = {
  // توكن GitHub خاص بالرفع من أجهزة العائلة (gist scope — يمكن أن يكون حساباً ثانياً)
  GITHUB_PAT: '',  // ← ضع التوكن هنا بعد إعداده من لوحة إعداد نسخة العائلة
  // معرّف Gist المخصص لاستقبال تحديثات العائلة (اختياري — يُنشأ تلقائياً إذا تُرك فارغاً)
  GIST_ID: '',     // ← يُملأ تلقائياً أو اكتبه يدوياً
  // مفتاح التشفير (اختياري — اتركه فارغاً لرفع بدون تشفير؛ أو ضع مفتاح الأوُنر لتشفير أقوى)
  KEY_HEX: '',     // ← اختياري
};
// اسم ملف العائلة يعتمد على DEVICE_ID — كل نسخة لها ملفها في Gist
const FAMILY_UPLOAD_GIST_KEY  = 'ft_family_gist_id_v1';
// علامة تُضمَّن في نسخة العائلة تلقائياً عند التصدير
const IS_FAMILY_COPY = false;
// معرّف الجهاز — يُنشأ عشوائياً لكل نسخة عائلة مصدَّرة (يبقى ثابتاً فيها)
const FAMILY_DEVICE_ID = '';

// ══════════════════════════════════════════════════════════
//  سجل الدمج والاسترجاع قبل الدمج
// ══════════════════════════════════════════════════════════
const MERGE_HISTORY_KEY = 'ft_merge_history_v1';
const MERGE_HISTORY_LIMIT = 8;
let mergeHistory = [];

// تحميل السجل من الجلسة الحالية إن أمكن، وإلا من metadata محفوظة
(function _loadMergeHistory(){
  try{
    let raw = null;
    try{ raw = sessionStorage.getItem(MERGE_HISTORY_KEY); }catch(e){}
    if(!raw){
      try{ raw = localStorage.getItem(MERGE_HISTORY_KEY); }catch(e){}
    }
    if(raw){
      let parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) mergeHistory = parsed;
    } else {
      try{
        let meta = localStorage.getItem(MERGE_HISTORY_KEY + '_meta');
        if(meta){
          let parsed = JSON.parse(meta);
          if(Array.isArray(parsed)) mergeHistory = parsed;
        }
      }catch(e){}
    }
  }catch(e){}
  if(!Array.isArray(mergeHistory)) mergeHistory = [];
  setTimeout(_refreshMergeHistoryButtons, 0);
})();

// دالة اسم الملف الديناميكي

function _getFamilyGistFileName(){
  // الـ ID يُحفظ في localStorage — فريد لكل متصفح/جهاز فعلي
  // لا نستخدم FAMILY_DEVICE_ID (مُضمَّن في HTML ومتطابق بين جميع النسخ المشتركة)
  // لا نستخدم meta.deviceId (من ملف JSON مشترك → يُسبب تصادماً)
  var id=localStorage.getItem('ft_family_device_id')||'';
  if(!id){
    id=[...crypto.getRandomValues(new Uint8Array(4))].map(b=>b.toString(16).padStart(2,'0')).join('');
    try{localStorage.setItem('ft_family_device_id',id);}catch(e){}
  }
  return 'ft_family_'+id+'.dat';
}

// ══════════════════════════════════════════════════════════
// خريطة أسماء الأجهزة — تُحفظ محلياً عند المالك لتسمية الأجهزة يدوياً
// ══════════════════════════════════════════════════════════
const FT_DEVICE_NAME_MAP_KEY = 'ft_device_name_map';
function _getDeviceNameMap(){
  try{return JSON.parse(localStorage.getItem(FT_DEVICE_NAME_MAP_KEY)||'{}');}catch(e){return {};}
}
function _setDeviceName(devId, name){
  let map=_getDeviceNameMap();
  if(name)map[devId]=name; else delete map[devId];
  try{localStorage.setItem(FT_DEVICE_NAME_MAP_KEY,JSON.stringify(map));}catch(e){}
}
function _resolveDeviceName(devId, uploadedName){
  // خريطة المالك المحلية تأخذ الأولوية على اسم الجهاز المرفوع
  let map=_getDeviceNameMap();
  return map[devId]||uploadedName||'';
}

let people=[],expanded={},nextId=1,relPairs=[],currentAddParentId=null,currentEditId=null,editingSpouses=[],editingChildren=[],editingRelatives=[],tempPhoto=null;
// ── Navigation State (Two-layer family system) ──
let navStack=[];           // [{label, filter, scrollY}]
let currentFamilyFilter=null; // null=show all, {rootId, label}=filter to one family
function uid(){return nextId++;}
function crescent(c){return `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:13px;height:13px;display:inline-block"><path d="M7 1.5A5.5 5.5 0 1 0 12.5 7 5.508 5.508 0 0 1 7 1.5z" fill="${c||'#2e7d32'}"/></svg>`;}

// ══════════════════════════════════════════════════════════
//  فهارس البيانات — تُعاد بناؤها عند أي تغيير في people/relPairs
//  هدفها: تحويل عمليات O(n) المتكررة إلى O(1)
// ══════════════════════════════════════════════════════════
let _personMap   = new Map(); // id → person
let _childrenMap = new Map(); // parentId → [children]
let _relNumsMap  = new Map(); // personId → [pairNumbers]
let _migratedMap = new Map(); // motherId → count of children where motherId set but parentId differs
let _ancestorMapCache = new Map(); // startId → ancestorsMap
let _myKinCache  = new Map(); // targetId → kinship result
let _treeOrderCache = null;  // مخزن مؤقت لترتيب الشجرة

function _rebuildIndexes(){
  _personMap.clear();
  _childrenMap.clear();
  _migratedMap.clear();
  people.forEach(p=>{
    _personMap.set(p.id,p);
    let ch=_childrenMap.get(p.parentId);
    if(!ch){ch=[];_childrenMap.set(p.parentId,ch);}
    ch.push(p);
    if(p.motherId&&p.motherId!==p.parentId){
      _migratedMap.set(p.motherId,(_migratedMap.get(p.motherId)||0)+1);
    }
  });
  _rebuildRelNums();
  _ancestorMapCache.clear();
  _myKinCache.clear();
  _treeOrderCache=null;
}
function _rebuildRelNums(){
  _relNumsMap.clear();
  relPairs.forEach((pair,i)=>{
    pair.forEach(id=>{
      let arr=_relNumsMap.get(id);
      if(!arr){arr=[];_relNumsMap.set(id,arr);}
      arr.push(i+1);
    });
  });
}
function _invalidateKinCache(){_myKinCache.clear();_ancestorMapCache.clear();}
function _invalidateAll(){_rebuildIndexes();}

// ── دوال الفهرس العام (تُستخدم بديلاً عن find/filter المتكررة) ──
function getRelNums(id){return _relNumsMap.get(id)||[];}
function getRelNum(id){let r=getRelNums(id);return r.length?r[0]:null;}
function addRelPairOnce(a,b){if(!relPairs.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a))){relPairs.push([a,b]);_rebuildRelNums();}}
function addRelPair(a,b){addRelPairOnce(a,b);}
function removeRelPairsForPerson(id){relPairs=relPairs.filter(p=>!p.includes(id));_rebuildRelNums();}
function removeRelPair(id){removeRelPairsForPerson(id);}
function getRelativesOf(id){return relPairs.filter(p=>p.includes(id)).map(p=>p.find(x=>x!==id));}
function getAncestorLabel(id){
  let p=getPerson(id);if(!p)return'؟';
  let chain=[];
  let cur=getParent(p);let cnt=0;
  while(cur&&cnt<3){chain.push(cur.name);cur=getParent(cur);cnt++;}
  let connector=p.gender==='female'?'بنت':'بن';
  let result=p.name+(chain.length?' '+connector+' '+chain.join(' بن '):'');
  if(p.familyName)result+=' ('+p.familyName+')';
  return result;
}
function showFatihaOverlay(){
  let ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
  ov.innerHTML=`<div style="text-align:center;padding:16px;">
    <img src="${FATIHA_IMG}" style="max-width:280px;max-height:60vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);" onerror="this.parentElement.parentElement.remove()">
    <p style="color:#fff;font-size:12px;margin-top:8px;opacity:.7;">يُغلق تلقائياً...</p>
  </div>`;
  ov.onclick=()=>ov.remove();
  document.body.appendChild(ov);
  setTimeout(()=>{if(ov.parentNode)ov.remove();},3000);
}
function addPerson(d){
  let p={
    id:uid(),
    name:d.name||'',
    title:d.title||'',
    familyName:d.familyName||'',
    gender:d.gender||'male',
    dob:d.dob||'',
    dod:d.dod||'',
    deceased:d.deceased||false,
    parentId:d.parentId||null,
    fatherId:d.fatherId||null,       // ← NEW: links child to external father person record
    fatherName:d.fatherName||'',     // ← NEW: cached father name
    motherId:d.motherId||null,
    motherName:d.motherName||'',
    externalFatherName:d.externalFatherName||'', // kept for backward compat
    sortOrder:d.sortOrder!=null?d.sortOrder:9999,
    childrenFamilyName:d.childrenFamilyName||'',
    spouses:d.spouses||[],
    photo:d.photo||null,
    notes:d.notes||'',
    isExternal:d.isExternal||false
  };
  people.push(p);expanded[p.id]=false;
  // تحديث الفهارس مباشرةً دون إعادة بناء كامل
  _personMap.set(p.id,p);
  let ch=_childrenMap.get(p.parentId);if(!ch){ch=[];_childrenMap.set(p.parentId,ch);}ch.push(p);
  if(p.motherId&&p.motherId!==p.parentId){
    _migratedMap.set(p.motherId,(_migratedMap.get(p.motherId)||0)+1);
  }
  _ancestorMapCache.clear();_myKinCache.clear();_treeOrderCache=null;
  return p;
}
function getPerson(id){return _personMap.get(id)||null;}
function getChildren(id){return(_childrenMap.get(id)||[]).slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));}
// For rendering: external persons also get children via fatherId (external fathers) or motherId (external mothers)
function getChildrenForNode(id){
  let p=getPerson(id);
  let direct=(_childrenMap.get(id)||[]).slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
  if(p&&p.isExternal){
    let extra=[];
    if(p.gender==='male'){
      extra=people.filter(c=>c.fatherId===id&&c.parentId!==id)
        .sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
    } else {
      extra=people.filter(c=>c.motherId===id&&c.parentId!==id)
        .sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
    }
    return [...direct,...extra];
  }
  return direct;
}
function getChildrenForDisplay(id){return getChildren(id);}
function getRoots(includeExternal=false){return people.filter(p=>!p.parentId&&(includeExternal||!p.isExternal));}
function getParent(p){return p.parentId?getPerson(p.parentId):null;}
function getAncestorChain(p){
  let parts=[];let cur=getParent(p);
  while(cur){parts.push(cur.name);cur=getParent(cur);}
  return parts;
}
function isChildUnderMother(p){
  if(!p||!p.parentId)return false;
  let par=getPerson(p.parentId);
  return par&&par.gender==='female';
}
function getFullFatherLine(p){
  // New system: fatherId points to external father's person record
  if(p.fatherId){
    let father=getPerson(p.fatherId);
    if(father){
      let chain=getAncestorChain(father);
      let label=father.name+(chain.length?' بن '+chain.join(' بن '):'')+
                (father.familyName?' ('+father.familyName+')':'');
      return label;
    }
  }
  // Legacy: fatherName text
  if(p.fatherName)return p.fatherName;
  // Legacy: externalFatherName
  if(isChildUnderMother(p)){
    if(p.externalFatherName)return p.externalFatherName;
    return '';
  }
  let chain=getAncestorChain(p);
  return chain.length?chain.join(' بن '):'';
}
function getMotherName(p){
  if(isChildUnderMother(p)){
    let m=getPerson(p.parentId);
    if(!m)return '';
    let chain=getAncestorChain(m);
    return m.name+(chain.length?' بنت '+chain.join(' بن '):'')+
           (m.familyName?' ('+m.familyName+')':'');
  }
  if(p.motherId){
    let m=getPerson(p.motherId);
    if(m){
      let chain=getAncestorChain(m);
      return m.name+(chain.length?' بنت '+chain.join(' بن '):'')+
             (m.familyName?' ('+m.familyName+')':'');
    }
  }
  if(p.motherName)return p.motherName;
  let par=getParent(p);
  if(par&&par.spouses.length===1)return par.spouses[0].name;
  return '';
}
function getFullLineageLabel(p){
  if(isChildUnderMother(p)){
    let mother=getPerson(p.parentId);
    let motherChain=mother?getAncestorChain(mother):[];
    let parts=[];
    if(p.externalFatherName)parts.push('أبوه: '+p.externalFatherName);
    if(mother){
      let m=mother.name;
      if(motherChain.length)m+=' بنت '+motherChain.join(' بن ');
      parts.push('أمه: '+m);
    }
    return parts.join(' — ');
  }
  let chain=getAncestorChain(p);
  return chain.length?chain.join(' بن '):'';
}
function getMaleChildren(id){return people.filter(p=>p.parentId===id&&p.gender==='male').sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));}
function getFemaleChildren(id){return people.filter(p=>p.parentId===id&&p.gender==='female').sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));}
function getSiblingsMale(p){return p.parentId?people.filter(s=>s.parentId===p.parentId&&s.id!==p.id&&s.gender==='male'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999)):[];}
function getSiblingsFemale(p){return p.parentId?people.filter(s=>s.parentId===p.parentId&&s.id!==p.id&&s.gender==='female'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999)):[];}
function getPaternalUncles(p){
  if(isChildUnderMother(p)){
    if(!p.fatherId)return[];
    let fp=getPerson(p.fatherId);if(!fp||!fp.parentId)return[];
    return people.filter(s=>s.parentId===fp.parentId&&s.id!==fp.id&&s.gender==='male'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));
  }
  let par=getParent(p);if(!par)return[];
  if(par.parentId==null)return[];
  return people.filter(s=>s.parentId===par.parentId&&s.id!==par.id&&s.gender==='male'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));
}
function getPaternalAunts(p){
  if(isChildUnderMother(p)){
    if(!p.fatherId)return[];
    let fp=getPerson(p.fatherId);if(!fp||!fp.parentId)return[];
    return people.filter(s=>s.parentId===fp.parentId&&s.id!==fp.id&&s.gender==='female'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));
  }
  let par=getParent(p);if(!par)return[];
  if(par.parentId==null)return[];
  return people.filter(s=>s.parentId===par.parentId&&s.id!==par.id&&s.gender==='female'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));
}
function _getMaternalParent(p){
  // Child under female = mother is the female parent
  if(isChildUnderMother(p))return getPerson(p.parentId);
  // Explicit motherId link (most reliable)
  if(p.motherId)return getPerson(p.motherId);
  // Look up via father's spouse list (supports both personId and relativeId)
  let par=getParent(p);if(!par)return null;
  let mn=p.motherName||(par.spouses&&par.spouses.length===1?par.spouses[0].name:'');
  if(!mn)return null;
  let ms=par.spouses&&par.spouses.find(s=>s.name===mn);
  if(!ms)return null;
  if(ms.personId&&getPerson(ms.personId))return getPerson(ms.personId);
  if(ms.relativeId&&getPerson(ms.relativeId))return getPerson(ms.relativeId);
  return null;
}
function getMaternalUncles(p){
  let mp=_getMaternalParent(p);
  if(!mp)return[];
  if(!mp.parentId)return[];
  return people.filter(s=>s.parentId===mp.parentId&&s.id!==mp.id&&s.gender==='male'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));
}
function getMaternalAunts(p){
  let mp=_getMaternalParent(p);
  if(!mp)return[];
  if(!mp.parentId)return[];
  return people.filter(s=>s.parentId===mp.parentId&&s.id!==mp.id&&s.gender==='female'&&!s.isExternal).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));
}
// Normalize Arabic: unify alef forms, ة→ه, ى/ئ→ي, strip tashkeel
function normalizeAr(s){
  return (s||'').toLowerCase()
    .replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ة/g,'ه')
    .replace(/[\u064B-\u065F\u0670]/g,'');
}
// ── قائمة الألقاب الشرفية المعيارية ──
const KNOWN_TITLES=['السيد','السيدة','سيد','سيدة','دكتور','دكتورة','أستاذ','أستاذة','د','أ'];
// ── تجريد الألقاب من نص البحث ──
function stripTitlesFromQuery(q){
  let norm=normalizeAr(q||'').trim();
  for(let t of KNOWN_TITLES){
    let nt=normalizeAr(t);
    norm=norm.replace(new RegExp('^'+nt+'\\s+'),'')
             .replace(new RegExp('\\s+'+nt+'\\s+'),' ')
             .replace(new RegExp('\\s+'+nt+'$'),'');
  }
  return norm.trim();
}
// ── هل يحتوي النص على لقب شرفي؟ يُعيد اللقب الأصلي أو null ──
function extractTitleFromQuery(q){
  let norm=normalizeAr(q||'').trim();
  for(let t of KNOWN_TITLES){
    let nt=normalizeAr(t);
    if(norm.startsWith(nt+' ')||norm===nt) return t;
    if(norm.includes(' '+nt+' ')||norm.endsWith(' '+nt)) return t;
  }
  return null;
}
function getPersonFullLabel(p){
  let parts=[p.name];
  if(p.familyName)parts.push(p.familyName);
  if(p.childrenFamilyName)parts.push(p.childrenFamilyName);
  if(p.externalFatherName)parts.push(p.externalFatherName);
  if(p.spouses)p.spouses.forEach(s=>{if(s.name)parts.push(s.name);});
  // ── إضافة اسم الأم للبحث ──
  if(p.motherId){
    let m=getPerson(p.motherId);
    if(m){
      parts.push(m.name);
      if(m.familyName)parts.push(m.familyName);
      // اسم أب الأم (الجد من الأم)
      let mf=getParent(m);
      if(mf){parts.push(mf.name);if(mf.familyName)parts.push(mf.familyName);}
    }
  } else if(p.motherName){
    parts.push(p.motherName);
  }
  if(isChildUnderMother(p)){
    let mother=getPerson(p.parentId);
    if(mother){
      parts.push(mother.name);
      if(mother.familyName)parts.push(mother.familyName);
      getAncestorChain(mother).forEach(n=>parts.push(n));
    }
  } else {
    let f=getParent(p);
    if(f){
      parts.push(f.name);
      if(f.familyName)parts.push(f.familyName);
      let gf=getParent(f);
      if(gf){parts.push(gf.name);if(gf.familyName)parts.push(gf.familyName);}
      // اسم أم الأب (الجدة الأبوية) لدعم البحث المتقاطع
      let fm=f.motherId?getPerson(f.motherId):null;
      if(!fm&&f.motherName)fm={name:f.motherName};
      if(fm&&fm.name)parts.push(fm.name);
    }
  }
  return normalizeAr(parts.join(' '));
}
function matchesFullName(p,q){
  if(!q)return true;
  let label=getPersonFullLabel(p);
  // البحث يتجاهل الألقاب — يقارن الأسماء فقط
  let strippedQ=stripTitlesFromQuery(q);
  let qToUse=strippedQ||normalizeAr(q);
  return qToUse.trim().split(/\s+/).filter(Boolean).every(w=>label.includes(w));
}
// Score: sequential chain matching (name→father→grandfather→mother order)
function scoreMatch(p,q){
  if(!q)return 0;
  // تجريد الألقاب من استعلام البحث
  let strippedQ=stripTitlesFromQuery(q);
  let qForScore=strippedQ||normalizeAr(q);
  let words=qForScore.trim().split(/\s+/).filter(Boolean);
  if(!words.length)return 0;
  let fp=getParent(p);
  let gfp=fp?getParent(fp):null;
  let ggfp=gfp?getParent(gfp):null;
  let mp=p.motherId?getPerson(p.motherId):null;
  let mfp=mp?getParent(mp):null;
  // بناء سلسلة النسب المرتّبة للمقارنة التسلسلية
  let chain=[
    {field:'name',  val:normalizeAr(p.name)},
    {field:'father',val:fp?normalizeAr(fp.name):''},
    {field:'gf',    val:gfp?normalizeAr(gfp.name):''},
    {field:'ggf',   val:ggfp?normalizeAr(ggfp.name):''},
    {field:'mother',val:mp?normalizeAr(mp.name):normalizeAr(p.motherName||'')},
    {field:'mf',    val:mfp?normalizeAr(mfp.name):''},
    {field:'fam',   val:normalizeAr(p.familyName||'')},
  ];
  // مكافأة التسلسل: كل كلمة تطابق الحقل الصحيح في الترتيب
  let score=0;
  // ── مكافأة إضافية: إذا كان الاستعلام يحتوي على لقب يطابق لقب الشخص ──
  let queryTitle=extractTitleFromQuery(q);
  if(queryTitle&&p.title){
    let qTitleNorm=normalizeAr(queryTitle);
    let pTitleNorm=normalizeAr(p.title);
    if(pTitleNorm===qTitleNorm)score+=800; // وزن عالٍ جداً للمطابقة الكاملة للقب
    else if(pTitleNorm.startsWith(qTitleNorm)||qTitleNorm.startsWith(pTitleNorm))score+=400;
  } else if(!queryTitle&&!strippedQ&&q){
    // الاستعلام لقب فقط — ارفع كل من لديه لقب
    if(p.title)score+=200;
  }
  // ── أولاً: مكافأة التسلسل المتطابق ──
  let bestChainScore=0;
  for(let startIdx=0;startIdx<chain.length;startIdx++){
    let chainScore=0;
    let allMatched=true;
    for(let wi=0;wi<words.length;wi++){
      let ci=startIdx+wi;
      if(ci>=chain.length){allMatched=false;break;}
      let w=words[wi],v=chain[ci].val;
      if(!v){allMatched=false;break;}
      if(v===w)chainScore+=500-(wi*10);         // تطابق تام في الموضع الصحيح
      else if(v.startsWith(w))chainScore+=350-(wi*10);
      else if(v.includes(w))chainScore+=200-(wi*10);
      else{allMatched=false;break;}
    }
    if(allMatched&&chainScore>bestChainScore){
      bestChainScore=chainScore;
      if(startIdx===0)bestChainScore+=words.length*50;
    }
  }
  score+=bestChainScore;
  // ── ثانياً: نقاط لكل كلمة بشكل مستقل (إذا لم يكن تسلسل) ──
  if(bestChainScore===0){
    let name=chain[0].val,father=chain[1].val,gfather=chain[2].val,
        mother=chain[4].val,fam=chain[6].val;
    words.forEach(w=>{
      if(name===w)score+=300;
      else if(name.startsWith(w))score+=200;
      else if(name.includes(w))score+=100;
      else if(father.includes(w))score+=50;
      else if(gfather.includes(w)||fam.includes(w)||mother.includes(w))score+=25;
      else score+=1;
    });
  }
  return score;
}
function initData(){
  let r=addPerson({name:'جد العائلة',gender:'male',dob:'1930-01-01',dod:'2000-01-01',deceased:true,spouses:[{name:'جدة العائلة',gender:'female',deceased:true,divorced:false,dob:'1935-01-01',dod:'2005-01-01',relativeId:null}]});
  let c1=addPerson({name:'الابن الأكبر',gender:'male',dob:'1955-03-15',parentId:r.id,motherName:'جدة العائلة',spouses:[{name:'زوجة الابن',gender:'female',deceased:false,divorced:false,dob:'1960-06-20',relativeId:null}]});
  let c2=addPerson({name:'البنت',gender:'female',dob:'1958-07-10',parentId:r.id,motherName:'جدة العائلة',spouses:[{name:'زوج البنت',gender:'male',deceased:false,divorced:false,dob:'1955-11-05',relativeId:null}]});
  let g1=addPerson({name:'حفيد 1',gender:'male',dob:'1980-02-14',parentId:c1.id,motherName:'زوجة الابن',spouses:[]});
  let g2=addPerson({name:'حفيدة 1',gender:'female',dob:'1983-09-22',parentId:c1.id,motherName:'زوجة الابن',spouses:[{name:'زوج مطلق',gender:'male',deceased:false,divorced:true,dob:'1980-01-01',relativeId:null},{name:'الزوج الثاني',gender:'male',deceased:false,divorced:false,dob:'1978-05-10',relativeId:null}]});
  addPerson({name:'حفيد 2',gender:'male',dob:'1988-12-01',parentId:c2.id,motherName:'زوج البنت',spouses:[]});
  addRelPair(g1.id,g2.id);
}
let kinPerson1=null,kinPerson2=null;
// ── متغيرات التنقل في نتائج البحث ──
let _searchResultIds=[];  // قائمة IDs مرتّبة بالتسلسل الشجري
let _searchNavIdx=0;      // الموضع الحالي
function _hideSearchNavBar(){
  let bar=document.getElementById('search-nav-bar');
  if(bar)bar.style.display='none';
  document.body.classList.remove('search-active');
}
function _hideSrpOverlay(){} // لم يعد مستخدماً
function _showSrpOverlay(){} // لم يعد مستخدماً

// إنشاء شريط التنقل في نتائج البحث بـ JS (ليُحفظ في نسخ التصدير)
(function(){
  let bar=document.createElement('div');
  bar.id='search-nav-bar';
  bar.style.cssText='display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:460;background:#1e40af;color:#fff;border-radius:28px;padding:0;box-shadow:0 6px 24px rgba(30,64,175,.55);align-items:center;white-space:nowrap;overflow:hidden;min-width:260px;max-width:calc(100vw - 32px);';
  bar.innerHTML=
    '<div style="display:flex;align-items:stretch;">'+
    '<button id="snb-prev" onclick="searchNavPrev()" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;padding:13px 18px;line-height:1;flex-shrink:0;" title="السابق">‹</button>'+
    '<div id="snb-info" onclick="searchNavCurrent()" title="اضغط لعرض نتائج البحث" style="flex:1;min-width:0;position:relative;padding:10px 4px;cursor:pointer;user-select:none;-webkit-user-select:none;">'+
      '<div id="snb-name" style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;padding:0 4px;"></div>'+
      '<div id="snb-count" style="font-size:11px;opacity:.8;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:4px;"></div>'+
    '</div>'+
    '<button id="snb-next" onclick="searchNavNext()" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;padding:13px 18px;line-height:1;flex-shrink:0;" title="التالي">›</button>'+
    '<button id="snb-clear" onclick="clearSearch()" style="background:rgba(255,255,255,.08);border:none;border-right:1px solid rgba(255,255,255,.2);color:#fff;font-size:17px;cursor:pointer;padding:13px 15px;line-height:1;flex-shrink:0;" title="إلغاء البحث">✕</button>'+
    '</div>';
  document.body.appendChild(bar);
})();

