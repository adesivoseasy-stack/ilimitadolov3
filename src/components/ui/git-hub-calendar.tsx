"use client";

import { useState, useEffect } from "react";
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ContributionDay {
  date: string;
  count: number;
}

interface GitHubCalendarProps {
  data: ContributionDay[];
  colors?: string[];
}

const GitHubCalendar = ({ data, colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] }: GitHubCalendarProps) => {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const today = new Date();
  const startDate = subDays(today, 364);
  const weeks = 53;

  useEffect(() => {
    setContributions(data);
  }, [data]);

  const maxCount = Math.max(1, ...contributions.map(c => c.count));
  const getColor = (count: number) => {
    if (count === 0) return colors[0];
    const ratio = count / maxCount;
    if (ratio <= 0.25) return colors[1];
    if (ratio <= 0.50) return colors[2];
    if (ratio <= 0.75) return colors[3];
    return colors[4] || colors[colors.length - 1];
  };

  const renderWeeks = () => {
    const weeksArray = [];
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });

    for (let i = 0; i < weeks; i++) {
      const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
      });

      weeksArray.push(
        <div key={i} className="flex flex-col gap-1">
          {weekDays.map((day, index) => {
            const contribution = contributions.find((c) => isSameDay(new Date(c.date as string), day));
            const color = contribution ? getColor(contribution.count) : colors[0];
            const count = contribution?.count || 0;

            return (
              <Popover key={index}>
                <PopoverTrigger asChild>
                  <div
                    className="w-3 h-3 rounded-[4px] cursor-pointer transition-transform hover:scale-150 hover:ring-2 hover:ring-primary/50"
                    style={{ backgroundColor: color }}
                    title={`${format(day, "dd/MM/yyyy")}: ${count} ações`}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 text-sm" side="top" align="center">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground">{format(day, "dd/MM/yyyy")}</span>
                    <span className="text-muted-foreground">
                      {count === 0 ? "Nenhuma ação" : `${count} ${count === 1 ? "ação" : "ações"}`}
                    </span>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      );
      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return weeksArray;
  };

  const renderMonthLabels = () => {
    const months = [];
    let currentMonth = startDate;
    for (let i = 0; i < 12; i++) {
      months.push(
        <span key={i} className="text-xs text-muted-foreground">
          {format(currentMonth, "MMM")}
        </span>
      );
      currentMonth = addDays(currentMonth, 30);
    }
    return months;
  };

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="max-w-full overflow-hidden p-3 sm:p-4 border border-border/50 rounded-xl bg-card/70 backdrop-blur-sm">
      <div className="flex min-w-max">
        <div className="flex flex-col justify-between mt-5 mr-2 shrink-0">
          {dayLabels.map((day, index) => (
            <span key={index} className="text-[10px] sm:text-xs text-muted-foreground h-2.5 sm:h-3">
              {day}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto scrollbar-none max-w-full pb-1">
          <div className="flex min-w-max gap-3 sm:gap-4 mb-2">{renderMonthLabels()}</div>
          <div className="flex gap-1 min-w-max">{renderWeeks()}</div>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 justify-center flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs items-center flex-wrap">
        <span className="text-muted-foreground">Menos</span>
        {colors.map((color, index) => (
          <div key={index} className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[4px]" style={{ backgroundColor: color }} />
        ))}
        <span className="text-muted-foreground">Mais</span>
      </div>
    </div>
  );
};

export { GitHubCalendar };
