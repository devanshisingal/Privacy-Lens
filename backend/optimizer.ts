import { noiseCategories }
from "./noise_categories";

export function
findBestNoise(
    historyText: string,
    predictProfile: (text: string) => Record<string, number>
){

 let bestCategory = "";
 let bestDrop = -1;

 const original =
     predictProfile(
         historyText
     );

 const topProfile =
     Object.entries(original)
     .sort(
      (a,b)=>b[1]-a[1]
     )[0];

 const targetLabel =
     topProfile[0];

 const targetScore =
     topProfile[1];

 for(
   const [category,terms]
   of Object.entries(
       noiseCategories
   )
 ){

   const newText =
      historyText +
      " " +
      terms.join(" ");

   const newProfiles =
       predictProfile(
           newText
       );

   const newScore =
       newProfiles[
          targetLabel
       ] || 0;

   const drop =
       targetScore -
       newScore;

   if(drop > bestDrop){

      bestDrop = drop;
      bestCategory =
          category;
   }
 }

 return {
   category: bestCategory,
   drop: bestDrop
 };
}