import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { Activity, Gauge, Milestone, Route, ShipWheel } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { RouteMetrics } from "../types";
import { LoadingBlock } from "./LoadingBlock";
import { MetricCard } from "./MetricCard";

interface MetricsChartsProps {
  metrics?: RouteMetrics;
  isLoading: boolean;
}

interface ChartPanelProps {
  title: string;
  option: EChartsOption;
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function riskTone(score: number) {
  if (score >= 75) return "red";
  if (score >= 55) return "amber";
  return "green";
}

function ChartPanel({ title, option }: ChartPanelProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [option]);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <div ref={chartRef} className="mt-3 h-[280px] w-full" />
    </article>
  );
}

export function MetricsCharts({ metrics, isLoading }: MetricsChartsProps) {
  const gaugeOption = useMemo<EChartsOption>(() => {
    if (!metrics) return {};
    return {
      color: ["#b42318"],
      tooltip: { formatter: "{b}: {c}" },
      series: [
        {
          type: "gauge",
          min: 0,
          max: 100,
          radius: "94%",
          progress: { show: true, width: 14 },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.55, "#0f766e"],
                [0.75, "#d97706"],
                [1, "#b42318"],
              ],
            },
          },
          axisTick: { distance: -20, length: 6, lineStyle: { color: "#ffffff" } },
          splitLine: { distance: -23, length: 13, lineStyle: { color: "#ffffff", width: 2 } },
          axisLabel: { color: "#57534e", distance: 20 },
          pointer: { width: 5 },
          title: { offsetCenter: [0, "68%"], color: "#44403c", fontSize: 13 },
          detail: {
            valueAnimation: true,
            formatter: "{value}",
            color: "#17201c",
            fontSize: 34,
            offsetCenter: [0, "34%"],
          },
          data: [{ value: metrics.ice_risk_score, name: "Ice risk score" }],
        },
      ],
    };
  }, [metrics]);

  const profileOption = useMemo<EChartsOption>(() => {
    if (!metrics) return {};
    return {
      color: ["#b42318", "#d97706", "#0f766e"],
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, textStyle: { color: "#57534e" } },
      grid: { left: 42, right: 18, top: 30, bottom: 58 },
      xAxis: {
        type: "category",
        data: metrics.checkpoints.map((point) => `${point.distance_km} km`),
        axisLabel: { color: "#57534e" },
        axisLine: { lineStyle: { color: "#d6d3d1" } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { color: "#57534e" },
        splitLine: { lineStyle: { color: "#e7e5e4" } },
      },
      series: [
        {
          name: "Ice risk",
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: metrics.checkpoints.map((point) => point.ice_risk_score),
        },
        {
          name: "Travel difficulty",
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: metrics.checkpoints.map((point) => point.travel_difficulty),
        },
        {
          name: "Performance",
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: metrics.checkpoints.map((point) => point.performance_index),
        },
      ],
    };
  }, [metrics]);

  const radarOption = useMemo<EChartsOption>(() => {
    if (!metrics) return {};
    return {
      color: ["#0f766e"],
      tooltip: {},
      radar: {
        radius: "66%",
        indicator: [
          { name: "Ice", max: 100 },
          { name: "Difficulty", max: 100 },
          { name: "Weather", max: 100 },
          { name: "Fuel", max: 100 },
          { name: "Performance", max: 100 },
        ],
        axisName: { color: "#57534e" },
        splitLine: { lineStyle: { color: "#d6d3d1" } },
        splitArea: { areaStyle: { color: ["#fafaf9", "#f5f5f4"] } },
        axisLine: { lineStyle: { color: "#d6d3d1" } },
      },
      series: [
        {
          type: "radar",
          areaStyle: { opacity: 0.18 },
          lineStyle: { width: 3 },
          data: [
            {
              value: [
                metrics.ice_risk_score,
                metrics.travel_difficulty,
                metrics.weather_exposure,
                metrics.fuel_efficiency_index,
                metrics.ship_performance_index,
              ],
              name: metrics.route_name,
            },
          ],
        },
      ],
    };
  }, [metrics]);

  const distanceOption = useMemo<EChartsOption>(() => {
    if (!metrics) return {};
    const distanceValues = metrics.checkpoints.map((point) => point.distance_km);
    return {
      color: ["#2563eb"],
      tooltip: { trigger: "axis" },
      grid: { left: 54, right: 20, top: 28, bottom: 44 },
      xAxis: {
        type: "category",
        data: metrics.checkpoints.map((point) => point.label),
        axisLabel: { color: "#57534e", rotate: 24 },
        axisLine: { lineStyle: { color: "#d6d3d1" } },
      },
      yAxis: {
        type: "value",
        name: "km",
        axisLabel: { color: "#57534e" },
        splitLine: { lineStyle: { color: "#e7e5e4" } },
      },
      series: [
        {
          name: "Cumulative distance",
          type: "bar",
          barMaxWidth: 28,
          data: distanceValues,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          markLine: {
            symbol: "none",
            data: [{ yAxis: metrics.total_distance_km, name: "Total distance" }],
            label: { formatter: `${formatNumber(metrics.total_distance_km, 0)} km`, color: "#17201c" },
            lineStyle: { color: "#17201c", type: "dashed" },
          },
        },
      ],
    };
  }, [metrics]);

  if (isLoading) return <LoadingBlock label="Loading DuckDB metrics" minHeight="min-h-[520px]" />;
  if (!metrics) return null;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Route Distance"
          value={`${formatNumber(metrics.total_distance_km, 0)} km`}
          detail={`${metrics.checkpoints.length} checkpoint samples from local risk data`}
          icon={Route}
          tone="teal"
        />
        <MetricCard
          label="Ice-Risk Score"
          value={`${formatNumber(metrics.ice_risk_score, 0)} / 100`}
          detail={`Updated ${metrics.last_updated}`}
          icon={Activity}
          tone={riskTone(metrics.ice_risk_score)}
        />
        <MetricCard
          label="Travel Difficulty"
          value={`${formatNumber(metrics.travel_difficulty, 0)} / 100`}
          detail={`${formatNumber(metrics.estimated_days)} estimated sailing days`}
          icon={Gauge}
          tone={riskTone(metrics.travel_difficulty)}
        />
        <MetricCard
          label="Ship Performance"
          value={`${formatNumber(metrics.ship_performance_index, 0)} / 100`}
          detail={`${formatNumber(metrics.avg_speed_knots)} knot average speed`}
          icon={ShipWheel}
          tone={metrics.ship_performance_index >= 76 ? "green" : metrics.ship_performance_index >= 64 ? "amber" : "red"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Ice-Risk Gauge" option={gaugeOption} />
        <ChartPanel title="Checkpoint Risk Profile" option={profileOption} />
        <ChartPanel title="Operational Risk Radar" option={radarOption} />
        <ChartPanel title="Distance Accumulation" option={distanceOption} />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-950">
          <Milestone className="h-4 w-4 text-teal-700" aria-hidden="true" />
          Route Checkpoints
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Checkpoint</th>
                <th className="py-2 pr-4 font-semibold">Distance</th>
                <th className="py-2 pr-4 font-semibold">Ice Risk</th>
                <th className="py-2 pr-4 font-semibold">Difficulty</th>
                <th className="py-2 pr-4 font-semibold">Performance</th>
                <th className="py-2 pr-4 font-semibold">Sea State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {metrics.checkpoints.map((point) => (
                <tr key={point.checkpoint}>
                  <td className="py-3 pr-4 font-medium text-stone-950">{point.label}</td>
                  <td className="py-3 pr-4">{formatNumber(point.distance_km, 0)} km</td>
                  <td className="py-3 pr-4">{point.ice_risk_score}</td>
                  <td className="py-3 pr-4">{point.travel_difficulty}</td>
                  <td className="py-3 pr-4">{point.performance_index}</td>
                  <td className="py-3 pr-4">{point.sea_state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
