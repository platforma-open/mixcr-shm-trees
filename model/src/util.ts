import {
  AxesId,
  AxesSpec,
  AxisId,
  AxisSpec,
  isPColumnSpec,
  PColumnSpec,
  PObjectSpec,
  ResultPoolEntry
} from '@platforma-sdk/model';

/** @deprecated */
export function isPColumnSpecResult(
  r: ResultPoolEntry<PObjectSpec>
): r is ResultPoolEntry<PColumnSpec> {
  return isPColumnSpec(r.obj);
}

export function domainsEqual(
  domain1: Record<string, string> | undefined,
  domain2: Record<string, string> | undefined
): boolean {
  if (domain1 === domain2) return true;
  if (domain1 === undefined) domain1 = {};
  if (domain2 === undefined) domain2 = {};
  const dEntries1 = Object.entries(domain1);
  const dEntries2 = Object.entries(domain2);
  if (dEntries1.length !== dEntries2.length) return false;
  for (const [domain, domainValue] of dEntries1) if (domain2[domain] !== domainValue) return false;
  return true;
}

export function matchAxesId(axesId: AxesId, axesSpec: AxesSpec) {
  if (axesId.length !== axesSpec.length) return false;
  for (let i = 0; i < axesId.length; ++i) if (!matchAxisId(axesId[i], axesSpec[i])) return false;
  return true;
}

export function matchAxisId(axisId: AxisId, axisSpec: AxisSpec) {
  return (
    axisId.type === axisSpec.type &&
    axisId.name === axisSpec.name &&
    domainsEqual(axisId.domain, axisSpec.domain)
  );
}

export function axesIdEqual(axisId1: AxisId, axisId2: AxisId) {
  return (
    axisId1.type === axisId2.type &&
    axisId1.name === axisId2.name &&
    domainsEqual(axisId1.domain, axisId2.domain)
  );
}
