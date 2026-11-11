// Как подробности вливаются в лёгкую часть данных. Тот же порядок действий использует загрузчик сайта (assets/js/data-loader.js).
export function mergeAppearanceDetails(appearances,details){const idx={};appearances.forEach(a=>idx[a.id]=a);
  for(const [id,d] of Object.entries(details)){const a=idx[id];if(!a)throw Error('подробности для несуществующего появления '+id);
    for(const [k,v] of Object.entries(d)){if(k==='episodes'){v.forEach((x,i)=>{if(x!==null&&a.episodes&&a.episodes[i])a.episodes[i].description=x})}else a[k]=v}}}
export function mergeEpisodeDetails(episodes,details){for(const [id,d] of Object.entries(details)){if(!episodes[id])throw Error('подробности для несуществующей серии '+id);Object.assign(episodes[id],d)}}
