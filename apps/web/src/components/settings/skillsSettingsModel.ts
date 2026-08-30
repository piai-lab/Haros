// FILE: skillsSettingsModel.ts
// Purpose: Groups duplicate skill copies for Settings -> Skills so shared names render once.
// Layer: Settings UI logic
// Exports: origin metadata, canonical skill grouping, and section ordering helpers.

import { ENGINE_KINDS, type EngineKind, type EngineSkillDescriptor } from "@harnessos/contracts";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { DEFAULT_PROVIDER_ORDER } from "~/engineOrdering";

export interface SkillOriginInfo {
  readonly label: string;
  readonly engine: EngineKind | null;
}

export interface SettingsSkillSource {
  readonly skill: EngineSkillDescriptor;
  readonly origin: string;
  readonly originInfo: SkillOriginInfo;
}

export interface SettingsSkillGroup {
  readonly key: string;
  readonly displayName: string;
  readonly description: string;
  readonly primarySkill: EngineSkillDescriptor;
  readonly engines: ReadonlyArray<EngineKind>;
  readonly sources: ReadonlyArray<SettingsSkillSource>;
  readonly section: string;
}

export interface SettingsSkillSection {
  readonly key: string;
  readonly title: string;
  readonly groups: ReadonlyArray<SettingsSkillGroup>;
}

const SHARED_SKILLS_SECTION = "shared";
const PERSONAL_ORIGIN = "personal";
const ENGINE_KIND_SET = new Set<string>(ENGINE_KINDS);
const skillOriginForEngine = (engine: EngineKind): string =>
  engine === "claude" ? "claude" : engine;
export const ORIGIN_SECTION_ORDER = [
  ...ENGINE_KINDS.map(skillOriginForEngine),
  "agents",
  "project",
] as const;

function engineForSkillOrigin(origin: string): EngineKind | null {
  const candidate = origin === "claude" ? "claude" : origin;
  return ENGINE_KIND_SET.has(candidate) ? (candidate as EngineKind) : null;
}

export function skillOriginInfo(scope: string | undefined): SkillOriginInfo {
  switch (scope) {
    case "oa":
      return { label: "Haros", engine: null };
    case "agents":
      return { label: "Shared (.agents)", engine: null };
    case "project":
      return { label: "Project", engine: null };
    default: {
      const engine = scope === undefined ? null : engineForSkillOrigin(scope);
      return engine
        ? { label: ENGINE_DISPLAY_NAMES[engine], engine }
        : { label: scope ?? "Personal", engine: null };
    }
  }
}

export function enginesForSkillOrigin(origin: string): EngineKind[] {
  const engine = skillOriginInfo(origin).engine;
  return engine ? [engine] : [];
}

export function settingsSkillNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function skillDisplayName(skill: EngineSkillDescriptor): string {
  return skill.interface?.displayName ?? skill.name;
}

export function isHarosSkillSource(skill: EngineSkillDescriptor): boolean {
  return skill.scope === "oa" || skill.path.split(/[\\/]+/).includes(".harnessos");
}

export function engineDisplayName(engine: EngineKind): string {
  return ENGINE_DISPLAY_NAMES[engine];
}

export function sortEngineStack(engines: ReadonlyArray<EngineKind>): EngineKind[] {
  return engines.toSorted(
    (left, right) => DEFAULT_PROVIDER_ORDER.indexOf(left) - DEFAULT_PROVIDER_ORDER.indexOf(right),
  );
}

function originRank(origin: string): number {
  const index = (ORIGIN_SECTION_ORDER as readonly string[]).indexOf(origin);
  return index >= 0 ? index : ORIGIN_SECTION_ORDER.length;
}

function sourceSortKey(source: SettingsSkillSource): string {
  return `${originRank(source.origin).toString().padStart(2, "0")}\u0000${source.skill.path}`;
}

function sectionTitle(section: string): string {
  if (section === SHARED_SKILLS_SECTION) {
    return "Shared skills";
  }
  return `From ${skillOriginInfo(section).label}`;
}

function sectionRank(section: string): number {
  if (section === SHARED_SKILLS_SECTION) {
    return -1;
  }
  return originRank(section);
}

// Creates one canonical row per normalized skill name. Duplicate engine copies
// stay visible as sources instead of letting the first origin hide the rest.
export function buildSettingsSkillGroups(
  skills: ReadonlyArray<EngineSkillDescriptor>,
): SettingsSkillGroup[] {
  const groups = new Map<string, SettingsSkillSource[]>();
  for (const skill of skills) {
    const key = settingsSkillNameKey(skill.name);
    const origin = skill.scope ?? PERSONAL_ORIGIN;
    const source: SettingsSkillSource = {
      skill,
      origin,
      originInfo: skillOriginInfo(origin),
    };
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }

  return [...groups.entries()]
    .map(([key, unsortedSources]): SettingsSkillGroup | null => {
      const sources = unsortedSources.toSorted((left, right) =>
        sourceSortKey(left).localeCompare(sourceSortKey(right)),
      );
      const primarySkill = sources[0]?.skill;
      if (!primarySkill) {
        return null;
      }
      const engines = sortEngineStack(
        sources
          .flatMap((source) => enginesForSkillOrigin(source.origin))
          .filter((engine, index, all) => all.indexOf(engine) === index),
      );
      const section =
        sources.length > 1 ? SHARED_SKILLS_SECTION : (sources[0]?.origin ?? PERSONAL_ORIGIN);
      const description =
        primarySkill.interface?.shortDescription ?? primarySkill.description ?? "No description.";
      return {
        key,
        displayName: skillDisplayName(primarySkill),
        description,
        primarySkill,
        engines,
        sources,
        section,
      } satisfies SettingsSkillGroup;
    })
    .filter((group): group is SettingsSkillGroup => group !== null)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function buildSettingsSkillSections(
  skills: ReadonlyArray<EngineSkillDescriptor>,
): SettingsSkillSection[] {
  const sections = new Map<string, SettingsSkillGroup[]>();
  for (const group of buildSettingsSkillGroups(skills)) {
    sections.set(group.section, [...(sections.get(group.section) ?? []), group]);
  }

  return [...sections.entries()]
    .map(([key, groups]) => ({
      key,
      title: sectionTitle(key),
      groups,
    }))
    .sort((left, right) => sectionRank(left.key) - sectionRank(right.key));
}
