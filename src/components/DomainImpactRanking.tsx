import { useEffect, useState } from "react";

interface DomainImpactRankingProps {
  userId: string;
}

export default function DomainImpactRanking({ userId }: DomainImpactRankingProps) {

  const [impacts,setImpacts] =
    useState<any[]>([]);

  useEffect(()=>{
    if (!userId) return;
    fetch(`/api/domain-impact?userId=${userId}`)
      .then(r=>r.json())
      .then(data=>{

        setImpacts(
          data.impacts || []
        );

      });

  },[userId]);

  return (

    <div className="bg-white rounded-xl p-6 shadow">

      <h2 className="text-xl font-bold mb-4">
        Top Profiling Contributors
      </h2>

      <div className="space-y-3">

        {impacts.map(
          (item,index)=>(

          <div
            key={item.domain}
            className="flex justify-between border-b pb-2"
          >

            <div>

              <div className="font-medium">

                #{index+1}
                {" "}
                {item.domain}

              </div>

            </div>

            <div>

              Risk Reduction:
              {" "}
              {item.riskReduction}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}