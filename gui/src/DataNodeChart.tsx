/*
 * Copyright 2023 Avaiga Private Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

import React, { useEffect, useState, useCallback, useMemo, MouseEvent } from "react";

import { DeleteOutline, Add } from "@mui/icons-material";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";

import { Chart, ColumnDesc, TraceValueType } from "taipy-gui";

interface DataNodeChartProps {
    configId?: string;
    tabularData?: Record<string, TraceValueType>;
    columns?: Record<string, ColumnDesc>;
    defaultConfig?: string;
    updateVarName?: string;
    uniqid: string;
}

const chartTypes: Record<string, { name: string; [prop: string]: unknown }> = {
    scatter: { name: "Cartesian", addIndex: true, axisNames: [] },
    pie: { name: "Pie", addIndex: false, axisNames: ["values", "labels"] },
};

const getChartTypeConfig = (...types: string[]) => {
    const ret: Record<string, Array<unknown>> = {};
    types.forEach((t, i) => {
        if (t && chartTypes[t]) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { name, ...cfg } = chartTypes[t];
            Object.entries(cfg).forEach(([k, v]) => {
                ret[k] = ret[k] || [];
                ret[k][i] = v;
            });
        }
    });
    return ret;
};

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};
const selectSx = { m: 1, width: 300 };

interface ChartConfig {
    traces?: Array<[string, string]>;
    types?: string[];
    columns?: Record<string, ColumnDesc>;
}

interface ColSelectProps {
    labelId: string;
    label: string;
    trace: number;
    axis: number;
    traceConf: Array<[string, string]>;
    setColConf: (trace: number, axis: number, col: string) => void;
    columns: string[];
}

const ColSelect = (props: ColSelectProps) => {
    const { labelId, trace, axis, columns, label, setColConf, traceConf } = props;

    const [col, setCol] = useState("");

    const onColChange = useCallback(
        (e: SelectChangeEvent<string>) => {
            setCol(e.target.value);
            setColConf(trace, axis, e.target.value);
        },
        [trace, axis, setColConf]
    );

    useEffect(() => setCol(getTraceCol(traceConf, trace, axis)), [traceConf, trace, axis]);

    return (
        <Select
            labelId={labelId}
            value={col}
            onChange={onColChange}
            input={<OutlinedInput label={label} />}
            MenuProps={MenuProps}
        >
            {columns.map((c) => (
                <MenuItem key={c} value={c}>
                    <ListItemText primary={c} />
                </MenuItem>
            ))}
        </Select>
    );
};

interface TypeSelectProps {
    labelId: string;
    label: string;
    trace: number;
    setTypeConf: (trace: number, cType: string) => void;
    value: string;
}

const TypeSelect = (props: TypeSelectProps) => {
    const { labelId, trace, label, setTypeConf, value } = props;

    const [cType, setType] = useState("");

    const onTypeChange = useCallback(
        (e: SelectChangeEvent<string>) => {
            setType(e.target.value);
            setTypeConf(trace, e.target.value);
        },
        [trace, setTypeConf]
    );

    useEffect(() => setType(value), [value]);

    return (
        <Select
            labelId={labelId}
            value={cType}
            onChange={onTypeChange}
            input={<OutlinedInput label={label} />}
            MenuProps={MenuProps}
        >
            {Object.entries(chartTypes).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                    <ListItemText primary={v.name} />
                </MenuItem>
            ))}
        </Select>
    );
};

const getTraceCol = (traceConf: Array<[string, string]>, trace: number, axis: number) => {
    return trace < traceConf.length ? traceConf[trace][axis] : "";
};

const DataNodeChart = (props: DataNodeChartProps) => {
    const { defaultConfig = "", uniqid } = props;

    const baseConfig = useMemo(() => {
        try {
            return JSON.parse(defaultConfig) as ChartConfig;
        } catch {
            // Do nothing
        }
        return undefined;
    }, [defaultConfig]);

    const [config, setConfig] = useState<ChartConfig | undefined>(undefined);
    useEffect(() => baseConfig && setConfig(baseConfig), [baseConfig]);

    const columns = useMemo(() => Object.values(props.columns || {}).map((c) => c.dfid), [props.columns]);

    const setTypeChange = useCallback(
        (trace: number, cType: string) =>
            setConfig((cfg) => {
                if (!cfg) {
                    return cfg;
                }
                const nts = (cfg.types || []).map((ct, i) => (i == trace ? cType : ct));
                return { ...cfg, types: nts, ...getChartTypeConfig(...nts) };
            }),
        []
    );

    const setColConf = useCallback(
        (trace: number, axis: number, col: string) =>
            setConfig((cfg) =>
                cfg
                    ? {
                          ...cfg,
                          traces: (cfg.traces || []).map((axises, idx) =>
                              idx == trace ? (axises.map((a, j) => (j == axis ? col : a)) as [string, string]) : axises
                          ),
                      }
                    : cfg
            ),
        []
    );

    const onAddTrace = useCallback(
        () =>
            setConfig((cfg) => {
                if (!cfg || !columns || !columns.length) {
                    return cfg;
                }
                const nt = cfg.types?.length ? cfg.types[0] : "scatter";
                const nts = [...(cfg.types || []), nt];
                return {
                    ...cfg,
                    types: nts,
                    traces: [...(cfg.traces || []), [columns[0], columns[columns.length > 1 ? 1 : 0]]],
                    ...getChartTypeConfig(...nts)
                };
            }),
        [columns]
    );
    const onRemoveTrace = useCallback((e: MouseEvent<HTMLElement>) => {
        const { idx } = e.currentTarget.dataset;
        const i = Number(idx);
        setConfig((cfg) => {
            if (!cfg || !cfg.traces || isNaN(i) || i >= cfg.traces.length) {
                return cfg;
            }
            const nts = (cfg.types || []).filter((c, j) => j != i);
            return {
                ...cfg,
                types: nts,
                traces: (cfg.traces || []).filter((t, j) => j != i),
                ...getChartTypeConfig(...nts),
            };
        });
    }, []);

    return (
        <>
            <Grid container>
                {config?.traces && config?.types
                    ? config?.traces.map((tc, idx) => {
                          const baseLabelId = `${uniqid}-trace${idx}-"`;
                          return (
                              <>
                                  <Grid item xs={2}>
                                      Trace {idx + 1}
                                  </Grid>
                                  <Grid item xs={3}>
                                      <FormControl sx={selectSx}>
                                          <InputLabel id={baseLabelId + "config"}>Category</InputLabel>
                                          <TypeSelect
                                              trace={idx}
                                              label="Category"
                                              labelId={baseLabelId + "config"}
                                              setTypeConf={setTypeChange}
                                              value={config.types ? config.types[idx]: ""}
                                          />
                                      </FormControl>
                                  </Grid>
                                  <Grid item xs={3}>
                                      <FormControl sx={selectSx}>
                                          <InputLabel id={baseLabelId + "x"}>X-axis</InputLabel>
                                          <ColSelect
                                              trace={idx}
                                              axis={0}
                                              traceConf={config.traces || []}
                                              label="X-axis"
                                              labelId={baseLabelId + "x"}
                                              columns={columns}
                                              setColConf={setColConf}
                                          />
                                      </FormControl>
                                  </Grid>
                                  <Grid item xs={3}>
                                      <FormControl sx={selectSx}>
                                          <InputLabel id={baseLabelId + "y"}>Y-axis</InputLabel>
                                          <ColSelect
                                              trace={idx}
                                              axis={1}
                                              traceConf={config.traces || []}
                                              label="Y-axis"
                                              labelId={baseLabelId + "y"}
                                              columns={columns}
                                              setColConf={setColConf}
                                          />
                                      </FormControl>
                                  </Grid>
                                  <Grid item xs={1}>
                                      {config.traces && config.traces.length > 1 ? (
                                          <IconButton onClick={onRemoveTrace} data-idx={idx}>
                                              <DeleteOutline color="primary" />
                                          </IconButton>
                                      ) : null}
                                  </Grid>
                              </>
                          );
                      })
                    : null}
                <Grid item xs={12}>
                    <Button onClick={onAddTrace}>
                        <Add color="primary" />
                        Add trace
                    </Button>
                </Grid>
            </Grid>
            <Chart
                defaultConfig={config ? JSON.stringify(config) : defaultConfig}
                updateVarName={props.updateVarName}
                data={props.tabularData}
                libClassName="taipy-chart"
            />
        </>
    );
};

export default DataNodeChart;
