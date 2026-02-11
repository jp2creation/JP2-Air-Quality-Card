const CARD_TYPE = "jp2-air-quality";
const CARD_NAME = "JP2 Air Quality";
const CARD_DESC = "Mushroom + mini-graph stack with threshold bar and full visual editor.";
const __BUILD_VERSION__ = "1.6.0";

const DEFAULT_NAME_BY_PRESET = {
  radon: "Radon",
  pressure: "Pression",
  humidity: "Humidité",
  temperature: "Température",
  voc: "COV / TVOC",
  pm1: "PM1",
  pm25: "PM2.5",
};

const DEFAULT_ICON_BY_PRESET = {
  radon: "mdi:radioactive",
  pressure: "mdi:gauge",
  humidity: "mdi:water-percent",
  temperature: "mdi:thermometer",
  voc: "mdi:air-filter",
  pm1: "mdi:weather-hazy",
  pm25: "mdi:weather-hazy",
};

class Jp2AirQualityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._helpersPromise = null;
    this._top = null;
    this._graph = null;
  }

  // UI stub config (sans "type", HA l'ajoute)
  static getStubConfig() {
    return {
      preset: "radon",
      entity: "",
      name: DEFAULT_NAME_BY_PRESET.radon,
      icon: DEFAULT_ICON_BY_PRESET.radon,
      show_graph: true,
      hours_to_show: 24,
      graph_height: 20,
      line_width: 2,
    };
  }

  // UI: éditeur visuel complet via ha-form
  static getConfigForm() {
    const presetOptions = [
      { label: "Radon", value: "radon" },
      { label: "Pression", value: "pressure" },
      { label: "Humidité", value: "humidity" },
      { label: "Température", value: "temperature" },
      { label: "COV / TVOC", value: "voc" },
      { label: "PM1", value: "pm1" },
      { label: "PM2.5", value: "pm25" },
    ];

    const ascendingSchema = (min, max, step = 1) => [
      { name: "offset", selector: { number: { min: -5000, max: 5000, step, mode: "box" } } },
      { name: "min", selector: { number: { min, max, step, mode: "box" } } },
      { name: "max", selector: { number: { min, max, step, mode: "box" } } },
      { name: "good_max", selector: { number: { min, max, step, mode: "box" } } },
      { name: "warn_max", selector: { number: { min, max, step, mode: "box" } } },
      { name: "decimals", selector: { number: { min: 0, max: 3, step: 1, mode: "box" } } },
      { name: "unit_fallback", selector: { text: {} } },
      { name: "label_good", selector: { text: {} } },
      { name: "label_warn", selector: { text: {} } },
      { name: "label_bad", selector: { text: {} } },
    ];

    const bandedSchema = (min, max, step = 1) => [
      { name: "offset", selector: { number: { min: -500, max: 500, step, mode: "box" } } },
      { name: "min", selector: { number: { min, max, step, mode: "box" } } },
      { name: "max", selector: { number: { min, max, step, mode: "box" } } },
      { name: "fair_min", selector: { number: { min, max, step, mode: "box" } } },
      { name: "good_min", selector: { number: { min, max, step, mode: "box" } } },
      { name: "good_max", selector: { number: { min, max, step, mode: "box" } } },
      { name: "fair_max", selector: { number: { min, max, step, mode: "box" } } },
      { name: "decimals", selector: { number: { min: 0, max: 3, step: 1, mode: "box" } } },
      { name: "unit_fallback", selector: { text: {} } },
      { name: "label_good", selector: { text: {} } },
      { name: "label_fair", selector: { text: {} } },
      { name: "label_bad", selector: { text: {} } },
    ];

    return {
      schema: [
        // BASE
        { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
        {
          type: "grid",
          name: "",
          flatten: true,
          column_min_width: "220px",
          schema: [
            { name: "preset", selector: { select: { options: presetOptions, mode: "dropdown" } } },
            { name: "name", selector: { text: {} } },
            { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
            { name: "show_graph", selector: { boolean: {} } },
          ],
        },

        // GRAPH
        {
          type: "grid",
          name: "",
          flatten: true,
          column_min_width: "220px",
          schema: [
            { name: "hours_to_show", selector: { number: { min: 1, max: 168, step: 1, mode: "box" } } },
            { name: "graph_height", selector: { number: { min: 10, max: 80, step: 1, mode: "box" } } },
            { name: "line_width", selector: { number: { min: 1, max: 10, step: 1, mode: "box" } } },
            { name: "graph_colors_from_bar", selector: { boolean: {} } },
          ],
        },

        // ASCENDING
        { type: "expandable", name: "radon", title: "Seuils Radon (ascendant)", schema: ascendingSchema(0, 5000, 1) },
        { type: "expandable", name: "voc", title: "Seuils COV / TVOC (ascendant)", schema: ascendingSchema(0, 20000, 1) },
        { type: "expandable", name: "pm1", title: "Seuils PM1 (ascendant)", schema: ascendingSchema(0, 500, 0.1) },
        { type: "expandable", name: "pm25", title: "Seuils PM2.5 (ascendant)", schema: ascendingSchema(0, 500, 0.1) },

        // BANDED
        { type: "expandable", name: "pressure", title: "Seuils Pression (rouge/orange/vert/orange/rouge)", schema: bandedSchema(800, 1100, 1) },
        { type: "expandable", name: "humidity", title: "Seuils Humidité (rouge/orange/vert/orange/rouge)", schema: bandedSchema(0, 100, 1) },
        { type: "expandable", name: "temperature", title: "Seuils Température (rouge/orange/vert/orange/rouge)", schema: bandedSchema(-50, 80, 0.5) },


        // THRESHOLD BAR
        {
          type: "expandable",
          name: "bar",
          title: "Barre des seuils (affichage + style)",
          flatten: true,
          schema: [
            { name: "enabled", selector: { boolean: {} } },
            { name: "height", selector: { number: { min: 1, max: 20, step: 1, mode: "box" } } },
            { name: "padding", selector: { number: { min: 0, max: 64, step: 1, mode: "box" } } },
            { name: "bottom", selector: { number: { min: 0, max: 40, step: 1, mode: "box" } } },

            { name: "thumb_size", selector: { number: { min: 6, max: 30, step: 1, mode: "box" } } },
            { name: "thumb_border_width", selector: { number: { min: 0, max: 8, step: 1, mode: "box" } } },
            { name: "thumb_border_color", selector: { text: {} } },

            { name: "track_good", selector: { text: {} } },
            { name: "track_warn", selector: { text: {} } },
            { name: "track_bad", selector: { text: {} } },

            { name: "fill_good", selector: { text: {} } },
            { name: "fill_warn", selector: { text: {} } },
            { name: "fill_bad", selector: { text: {} } },
            { name: "fill_none", selector: { text: {} } }
          ],
        },

        // ADVANCED
        {
          type: "expandable",
          name: "",
          title: "Avancé (templates + overrides)",
          flatten: true,
          schema: [
            { name: "secondary", selector: { template: {} } },
            { name: "color", selector: { template: {} } },
            { name: "mushroom", selector: { object: {} } },
            { name: "graph", selector: { object: {} } },
            { name: "name_by_preset", selector: { object: {} } },
            { name: "icon_by_preset", selector: { object: {} } },
          ],
        },
      ],

      computeLabel: (schema) => {
        const map = {
          entity: "Capteur",
          preset: "Preset",
          name: "Nom",
          icon: "Icône",
          show_graph: "Afficher le graphe",
          hours_to_show: "Heures affichées",
          graph_height: "Hauteur graphe",
          line_width: "Épaisseur ligne",
          graph_colors_from_bar: "Couleurs graphe = barre",

          offset: "Offset",
          min: "Min",
          max: "Max",
          decimals: "Décimales",
          unit_fallback: "Unité (fallback)",

          // ascending
          good_max: "Vert ≤",
          warn_max: "Orange ≤",
          label_good: "Label vert",
          label_warn: "Label orange",
          label_bad: "Label rouge",

          // banded
          fair_min: "Orange min",
          good_min: "Vert min",
          fair_max: "Orange max",
          label_fair: "Label orange",

          secondary: "Secondary (template)",
          color: "Color (template)",
          mushroom: "Override mushroom (YAML)",
          graph: "Override graph (YAML)",
          name_by_preset: "Override noms (par preset)",
          icon_by_preset: "Override icônes (par preset)",
        };


        if (schema.path?.[0] === "bar") {
          const barMap = {
            enabled: "Afficher la barre",
            height: "Hauteur barre (px)",
            padding: "Marge gauche/droite (px)",
            bottom: "Position bas (px)",
            thumb_size: "Taille curseur (px)",
            thumb_border_width: "Bord curseur (px)",
            thumb_border_color: "Couleur bord curseur",
            track_good: "Couleur zone verte (track)",
            track_warn: "Couleur zone orange (track)",
            track_bad: "Couleur zone rouge (track)",
            fill_good: "Couleur curseur vert",
            fill_warn: "Couleur curseur orange",
            fill_bad: "Couleur curseur rouge",
            fill_none: "Couleur (pas de donnée)"
          };
          return barMap[schema.name] || schema.name;
        }

        const bandedKeys = ["pressure", "humidity", "temperature"];
        if (schema.name === "good_max" && bandedKeys.includes(schema.path?.[0])) return "Vert max";

        return map[schema.name];
      },

      computeHelper: (schema) => {

        if (schema.path?.[0] === "bar") {
          switch (schema.name) {
            case "enabled":
              return "Active/désactive la barre des seuils (track + curseur).";
            case "height":
              return "Hauteur du track (en pixels).";
            case "padding":
              return "Marge gauche/droite de la barre (en pixels).";
            case "bottom":
              return "Distance de la barre par rapport au bas de la carte (px).";
            case "thumb_size":
              return "Taille du curseur (en pixels).";
            case "thumb_border_width":
              return "Épaisseur du bord du curseur (px).";
            case "thumb_border_color":
              return "Couleur CSS (ex: rgba(0,0,0,0.85) ou #000000).";
            case "track_good":
            case "track_warn":
            case "track_bad":
              return "Couleur CSS pour la zone correspondante (ex: rgba(...,0.30)).";
            case "fill_good":
            case "fill_warn":
            case "fill_bad":
            case "fill_none":
              return "Couleur CSS du curseur (ex: rgba(...,0.95)).";
          }
        }

        switch (schema.name) {
          case "preset":
            return "Choisis le type de capteur (radon / pression / humidité / température / COV / PM).";
          case "offset":
            return "Ex: pression au niveau mer = valeur + offset.";
          case "graph_colors_from_bar":
            return "Si activé, le mini-graph reprend les mêmes couleurs que la barre (fill_good/fill_warn/fill_bad).";
          case "secondary":
            return "Si rempli, remplace le texte secondaire généré par le preset.";
          case "color":
            return "Si rempli, remplace la couleur (green/orange/red/disabled) générée par le preset.";
          case "mushroom":
            return "Objet YAML fusionné dans la mushroom-template-card (tap_action, hold_action, etc.).";
          case "graph":
            return "Objet YAML fusionné dans mini-graph-card (points_per_hour, smoothing, etc.).";
          case "name_by_preset":
            return "Objet YAML: ex { pm25: 'PM2.5 Salon', voc: 'TVOC Couloir' }";
          case "icon_by_preset":
            return "Objet YAML: ex { pm25: 'mdi:blur', voc: 'mdi:air-filter' }";
          case "decimals":
            return "Nombre de décimales affichées dans le secondary.";
        }
        return undefined;
      },

      assertConfig: (config) => {
        if (config.mushroom && typeof config.mushroom !== "object") throw new Error("'mushroom' doit être un objet YAML.");
        if (config.graph && typeof config.graph !== "object") throw new Error("'graph' doit être un objet YAML.");
        if (config.name_by_preset && typeof config.name_by_preset !== "object") throw new Error("'name_by_preset' doit être un objet YAML.");
        if (config.bar && typeof config.bar !== "object") throw new Error("'bar' doit être un objet YAML.");
        if (config.graph_colors_from_bar !== undefined && typeof config.graph_colors_from_bar !== "boolean") throw new Error("'graph_colors_from_bar' doit être un booléen.");
        if (config.icon_by_preset && typeof config.icon_by_preset !== "object") throw new Error("'icon_by_preset' doit être un objet YAML.");
      },
    };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error(`${CARD_TYPE}: 'entity' est requis`);

    const defaults = {
      preset: "radon",
      name: DEFAULT_NAME_BY_PRESET.radon,
      icon: DEFAULT_ICON_BY_PRESET.radon,
      show_graph: true,

      // Global mapping overrides
      name_by_preset: {},
      icon_by_preset: {},

      // Threshold bar (track + cursor)
      bar: {
        enabled: true,
        height: 6,               // track height (px)
        padding: 16,             // left/right padding (px)
        bottom: 8,               // track bottom offset (px)
        thumb_size: 10,          // cursor size (px)
        thumb_border_width: 2,   // cursor border (px)
        thumb_border_color: "rgba(0,0,0,0.85)",
        // Track colors (zones)
        track_good: "rgba(69,213,142,0.30)",
        track_warn: "rgba(255,183,77,0.30)",
        track_bad:  "rgba(255,99,99,0.30)",
        // Cursor fill colors
        fill_good: "rgba(69,213,142,0.95)",
        fill_warn: "rgba(255,183,77,0.95)",
        fill_bad:  "rgba(255,99,99,0.95)",
        fill_none: "rgba(180,190,200,0.55)"
      },

      // Use bar colors for the graph thresholds too
      graph_colors_from_bar: true,

      // ASCENDING (vert -> orange -> rouge)
      radon: {
        offset: 0,
        min: 0,
        max: 300,
        good_max: 99,
        warn_max: 149,
        decimals: 1,
        unit_fallback: "Bq/m³",
        label_good: "Bon",
        label_warn: "Moyen",
        label_bad: "Mauvais",
      },
      voc: {
        offset: 0,
        min: 0,
        max: 3000,
        good_max: 250,
        warn_max: 2000,
        decimals: 0,
        unit_fallback: "ppb",
        label_good: "Faible",
        label_warn: "À ventiler",
        label_bad: "Très élevé",
      },
      pm1: {
        offset: 0,
        min: 0,
        max: 100,
        good_max: 10,
        warn_max: 25,
        decimals: 1,
        unit_fallback: "µg/m³",
        label_good: "Bon",
        label_warn: "Moyen",
        label_bad: "Mauvais",
      },
      pm25: {
        offset: 0,
        min: 0,
        max: 150,
        good_max: 12.0,
        warn_max: 35.4,
        decimals: 1,
        unit_fallback: "µg/m³",
        label_good: "Bon",
        label_warn: "Moyen",
        label_bad: "Mauvais",
      },

      // BANDED (rouge/orange/vert/orange/rouge)
      pressure: {
        offset: 27,
        min: 970,
        max: 1050,
        fair_min: 995,
        good_min: 1005,
        good_max: 1025,
        fair_max: 1035,
        decimals: 0,
        unit_fallback: "hPa",
        label_good: "Normal",
        label_fair: "Variable",
        label_bad: "Extrême",
      },
      humidity: {
        offset: 0,
        min: 0,
        max: 100,
        fair_min: 30,
        good_min: 40,
        good_max: 60,
        fair_max: 70,
        decimals: 0,
        unit_fallback: "%",
        label_good: "Confort",
        label_fair: "Ok",
        label_bad: "Inconfort",
      },
      temperature: {
        offset: 0,
        min: 0,
        max: 35,
        fair_min: 17,
        good_min: 19,
        good_max: 23,
        fair_max: 26,
        decimals: 1,
        unit_fallback: "°C",
        label_good: "Confort",
        label_fair: "Ok",
        label_bad: "Alerte",
      },

      // Graph defaults
      hours_to_show: 24,
      graph_height: 20,
      line_width: 2,

      // Advanced overrides
      secondary: undefined,
      color: undefined,
      mushroom: {},
      graph: {},
    };

    this._config = {
      ...defaults,
      ...config,
      name_by_preset: { ...(config.name_by_preset || {}) },
      icon_by_preset: { ...(config.icon_by_preset || {}) },

      bar: { ...defaults.bar, ...(config.bar || {}) },
      graph_colors_from_bar:
        typeof config.graph_colors_from_bar === "boolean"
          ? config.graph_colors_from_bar
          : defaults.graph_colors_from_bar,

      radon: { ...defaults.radon, ...(config.radon || {}) },
      voc: { ...defaults.voc, ...(config.voc || {}) },
      pm1: { ...defaults.pm1, ...(config.pm1 || {}) },
      pm25: { ...defaults.pm25, ...(config.pm25 || {}) },

      pressure: { ...defaults.pressure, ...(config.pressure || {}) },
      humidity: { ...defaults.humidity, ...(config.humidity || {}) },
      temperature: { ...defaults.temperature, ...(config.temperature || {}) },

      mushroom: { ...(config.mushroom || {}) },
      graph: { ...(config.graph || {}) },
    };

    // Default name/icon per preset if user didn't set them
    const nameMap = { ...DEFAULT_NAME_BY_PRESET, ...(this._config.name_by_preset || {}) };
    const iconMap = { ...DEFAULT_ICON_BY_PRESET, ...(this._config.icon_by_preset || {}) };

    if (!config.name) this._config.name = nameMap[this._config.preset] || "Capteur";
    if (!config.icon) this._config.icon = iconMap[this._config.preset] || "mdi:information";

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._top) this._top.hass = hass;
    if (this._graph) this._graph.hass = hass;
  }

  getCardSize() {
    return this._config?.show_graph ? 3 : 2;
  }

  async _getHelpers() {
    if (!this._helpersPromise) this._helpersPromise = window.loadCardHelpers();
    return this._helpersPromise;
  }

  _isAscendingPreset() {
    return ["radon", "voc", "pm1", "pm25"].includes(this._config.preset);
  }

  _ascendingParams() {
    const p = this._config.preset;
    if (p === "radon") return this._config.radon;
    if (p === "voc") return this._config.voc;
    if (p === "pm1") return this._config.pm1;
    if (p === "pm25") return this._config.pm25;
    return this._config.radon;
  }

  _bandedParams() {
    const p = this._config.preset;
    if (p === "pressure") return this._config.pressure;
    if (p === "humidity") return this._config.humidity;
    if (p === "temperature") return this._config.temperature;
    return this._config.pressure;
  }

  // ---------------------------
  // ASCENDING (vert -> orange -> rouge)
  // ---------------------------

  _secondaryTemplateAscending() {
    const p = this._ascendingParams();
    const off = Number(p.offset || 0);
    const decimals = Number.isFinite(Number(p.decimals)) ? Number(p.decimals) : 0;

    const unitFallback = (p.unit_fallback || "").replace(/'/g, "");
    const labelGood = (p.label_good || "Bon").replace(/'/g, "");
    const labelWarn = (p.label_warn || "Moyen").replace(/'/g, "");
    const labelBad = (p.label_bad || "Mauvais").replace(/'/g, "");

    const goodMax = Number(p.good_max);
    const warnMax = Number(p.warn_max);

    return `
{% set v = states(entity) | float(none) %}
{% set off = ${off} %}
{% set sl = (v + off) if v is not none else none %}
{% if sl is none %}
—
{% else %}
  {{ sl | round(${decimals}) }} {{ state_attr(entity,'unit_of_measurement') or '${unitFallback}' }} ·
  {% if sl <= ${goodMax} %} ${labelGood}
  {% elif sl <= ${warnMax} %} ${labelWarn}
  {% else %} ${labelBad}
  {% endif %}
{% endif %}`.trim();
  }

  _colorTemplateAscending() {
    const p = this._ascendingParams();
    const off = Number(p.offset || 0);
    const goodMax = Number(p.good_max);
    const warnMax = Number(p.warn_max);
    return `
{% set v = states(entity) | float(none) %}
{% set off = ${off} %}
{% set sl = (v + off) if v is not none else none %}
{% if sl is none %} disabled
{% elif sl <= ${goodMax} %} green
{% elif sl <= ${warnMax} %} orange
{% else %} red
{% endif %}`.trim();
  }
  _barStyleAscending() {
    const p = this._ascendingParams();

    const min = Number(p.min);
    const max = Number(p.max);
    const goodMax = Number(p.good_max);
    const warnMax = Number(p.warn_max);
    const off = Number(p.offset || 0);

    const goodPct = ((goodMax - min) / (max - min)) * 100;
    const warnPct = ((warnMax - min) / (max - min)) * 100;

    const bar = this._config.bar || {};
    const enabled = bar.enabled !== false;

    const pad = Number.isFinite(Number(bar.padding)) ? Number(bar.padding) : 16;
    const h = Number.isFinite(Number(bar.height)) ? Number(bar.height) : 6;
    const bottom = Number.isFinite(Number(bar.bottom)) ? Number(bar.bottom) : 8;

    const thumb = Number.isFinite(Number(bar.thumb_size)) ? Number(bar.thumb_size) : 10;
    const thumbBottom = Number.isFinite(Number(bar.thumb_bottom))
      ? Number(bar.thumb_bottom)
      : (bottom - 2);

    const borderW = Number.isFinite(Number(bar.thumb_border_width)) ? Number(bar.thumb_border_width) : 2;
    const borderColor = (bar.thumb_border_color || "rgba(0,0,0,0.85)");

    const trackGood = (bar.track_good || "rgba(69,213,142,0.30)");
    const trackWarn = (bar.track_warn || "rgba(255,183,77,0.30)");
    const trackBad = (bar.track_bad || "rgba(255,99,99,0.30)");

    const fillGood = (bar.fill_good || "rgba(69,213,142,0.95)");
    const fillWarn = (bar.fill_warn || "rgba(255,183,77,0.95)");
    const fillBad = (bar.fill_bad || "rgba(255,99,99,0.95)");
    const fillNone = (bar.fill_none || "rgba(180,190,200,0.55)");

    const paddingBottom = enabled ? (bottom + h) : 0;

    const barBlocks = enabled
      ? `
ha-card:before{
  content:"";
  position:absolute;
  left:${pad}px; right:${pad}px;
  bottom:${bottom}px;
  height:${h}px;
  border-radius:999px;
  background: var(--track);
}
ha-card:after{
  content:"";
  position:absolute;
  left: calc(${pad}px + (100% - ${pad * 2}px) * (var(--p) / 100));
  bottom:${thumbBottom}px;
  width:${thumb}px;
  height:${thumb}px;
  border-radius:999px;
  transform: translateX(-50%);
  background: var(--fill);
  box-shadow: 0 0 0 ${borderW}px ${borderColor};
  opacity: var(--thumb_opacity);
  pointer-events: none;
}`.trim()
      : ``;

    return `
ha-card{
  box-shadow:none;
  border-radius:0;
  background:none;

  position:relative;
  overflow:hidden;
  padding-bottom:${paddingBottom}px;

  {% set v = states(config.entity) | float(none) %}
  {% set off = ${off} %}
  {% set sl = (v + off) if v is not none else none %}

  --p: {% if sl is none %}0{% else %}
       {% set p = ((sl - ${min}) / (${max} - ${min}) * 100) %}
       {{ [0, [p, 100] | min] | max }}
       {% endif %};
  --thumb_opacity: {% if sl is none %}0{% else %}1{% endif %};

  --fill: {% if sl is none %} ${fillNone}
         {% elif sl <= ${goodMax} %} ${fillGood}
         {% elif sl <= ${warnMax} %} ${fillWarn}
         {% else %} ${fillBad}
         {% endif %};

  --track: linear-gradient(90deg,
    ${trackGood} 0%,
    ${trackGood} ${goodPct.toFixed(2)}%,
    ${trackWarn} ${goodPct.toFixed(2)}%,
    ${trackWarn} ${warnPct.toFixed(2)}%,
    ${trackBad}  ${warnPct.toFixed(2)}%,
    ${trackBad}  100%
  );
}
${barBlocks}
`.trim();
  }

  // ---------------------------
  // BANDED (rouge/orange/vert/orange/rouge)
  // ---------------------------

  _secondaryTemplateBanded() {
    const p = this._bandedParams();
    const off = Number(p.offset || 0);
    const decimals = Number.isFinite(Number(p.decimals)) ? Number(p.decimals) : 0;

    const unitFallback = (p.unit_fallback || "").replace(/'/g, "");
    const labelGood = (p.label_good || "Bon").replace(/'/g, "");
    const labelFair = (p.label_fair || "Moyen").replace(/'/g, "");
    const labelBad = (p.label_bad || "Mauvais").replace(/'/g, "");

    return `
{% set v = states(entity) | float(none) %}
{% set off = ${off} %}
{% set sl = (v + off) if v is not none else none %}
{% if sl is none %}
—
{% else %}
  {{ sl | round(${decimals}) }} {{ state_attr(entity,'unit_of_measurement') or '${unitFallback}' }} ·
  {% if ${Number(p.good_min)} <= sl <= ${Number(p.good_max)} %} ${labelGood}
  {% elif ${Number(p.fair_min)} <= sl <= ${Number(p.fair_max)} %} ${labelFair}
  {% else %} ${labelBad}
  {% endif %}
{% endif %}`.trim();
  }

  _colorTemplateBanded() {
    const p = this._bandedParams();
    const off = Number(p.offset || 0);
    return `
{% set v = states(entity) | float(none) %}
{% set off = ${off} %}
{% set sl = (v + off) if v is not none else none %}
{% if sl is none %} disabled
{% elif ${Number(p.good_min)} <= sl <= ${Number(p.good_max)} %} green
{% elif ${Number(p.fair_min)} <= sl <= ${Number(p.fair_max)} %} orange
{% else %} red
{% endif %}`.trim();
  }
  _barStyleBanded() {
    const p = this._bandedParams();

    const min = Number(p.min);
    const max = Number(p.max);
    const fairMin = Number(p.fair_min);
    const goodMin = Number(p.good_min);
    const goodMax = Number(p.good_max);
    const fairMax = Number(p.fair_max);
    const off = Number(p.offset || 0);

    const bar = this._config.bar || {};
    const enabled = bar.enabled !== false;

    const pad = Number.isFinite(Number(bar.padding)) ? Number(bar.padding) : 16;
    const h = Number.isFinite(Number(bar.height)) ? Number(bar.height) : 6;
    const bottom = Number.isFinite(Number(bar.bottom)) ? Number(bar.bottom) : 8;

    const thumb = Number.isFinite(Number(bar.thumb_size)) ? Number(bar.thumb_size) : 10;
    const thumbBottom = Number.isFinite(Number(bar.thumb_bottom))
      ? Number(bar.thumb_bottom)
      : (bottom - 2);

    const borderW = Number.isFinite(Number(bar.thumb_border_width)) ? Number(bar.thumb_border_width) : 2;
    const borderColor = (bar.thumb_border_color || "rgba(0,0,0,0.85)");

    const trackGood = (bar.track_good || "rgba(69,213,142,0.30)");
    const trackWarn = (bar.track_warn || "rgba(255,183,77,0.30)");
    const trackBad = (bar.track_bad || "rgba(255,99,99,0.30)");

    const fillGood = (bar.fill_good || "rgba(69,213,142,0.95)");
    const fillWarn = (bar.fill_warn || "rgba(255,183,77,0.95)");
    const fillBad = (bar.fill_bad || "rgba(255,99,99,0.95)");
    const fillNone = (bar.fill_none || "rgba(180,190,200,0.55)");

    const paddingBottom = enabled ? (bottom + h) : 0;

    const barBlocks = enabled
      ? `
ha-card:before{
  content:"";
  position:absolute;
  left:${pad}px; right:${pad}px;
  bottom:${bottom}px;
  height:${h}px;
  border-radius:999px;
  background: var(--track);
}
ha-card:after{
  content:"";
  position:absolute;
  left: calc(${pad}px + (100% - ${pad * 2}px) * (var(--p) / 100));
  bottom:${thumbBottom}px;
  width:${thumb}px;
  height:${thumb}px;
  border-radius:999px;
  transform: translateX(-50%);
  background: var(--fill);
  box-shadow: 0 0 0 ${borderW}px ${borderColor};
  opacity: var(--thumb_opacity);
  pointer-events: none;
}`.trim()
      : ``;

    return `
ha-card{
  box-shadow:none;
  border-radius:0;
  background:none;

  position: relative;
  overflow: hidden;
  padding-bottom: ${paddingBottom}px;

  {% set v = states(config.entity) | float(none) %}
  {% set off = ${off} %}
  {% set sl = (v + off) if v is not none else none %}

  --p: {% if sl is none %}0{% else %}
       {% set p = ((sl - ${min}) / (${max} - ${min}) * 100) %}
       {{ [0, [p, 100] | min] | max }}
       {% endif %};
  --thumb_opacity: {% if sl is none %}0{% else %}1{% endif %};

  --fill: {% if sl is none %} ${fillNone}
         {% elif ${goodMin} <= sl <= ${goodMax} %} ${fillGood}
         {% elif ${fairMin} <= sl <= ${fairMax} %} ${fillWarn}
         {% else %} ${fillBad}
         {% endif %};

  --p_fmin: {{ ((${fairMin}-${min})/(${max}-${min})*100) | round(2) }}%;
  --p_gmin: {{ ((${goodMin}-${min})/(${max}-${min})*100) | round(2) }}%;
  --p_gmax: {{ ((${goodMax}-${min})/(${max}-${min})*100) | round(2) }}%;
  --p_fmax: {{ ((${fairMax}-${min})/(${max}-${min})*100) | round(2) }}%;

  --track: linear-gradient(90deg,
    ${trackBad}  0%,
    ${trackBad}  var(--p_fmin),
    ${trackWarn} var(--p_fmin),
    ${trackWarn} var(--p_gmin),
    ${trackGood} var(--p_gmin),
    ${trackGood} var(--p_gmax),
    ${trackWarn} var(--p_gmax),
    ${trackWarn} var(--p_fmax),
    ${trackBad}  var(--p_fmax),
    ${trackBad}  100%
  );
}
${barBlocks}
`.trim();
  }

  _miniGraphResetStyle() {
    return `
ha-card{
  box-shadow:none;
  border-radius:0;
  background:none;
  margin-top:-6px;
}`.trim();
  }
  _graphThresholdsByPreset() {
    const bar = this._config.bar || {};
    const useBar = this._config.graph_colors_from_bar === true;

    const goodColor = useBar ? (bar.fill_good || "green") : "green";
    const warnColor = useBar ? (bar.fill_warn || "orange") : "orange";
    const badColor  = useBar ? (bar.fill_bad  || "red") : "red";

    if (this._isAscendingPreset()) {
      const p = this._ascendingParams();
      return [
        { value: Number(p.min), color: goodColor },
        { value: Number(p.good_max), color: warnColor },
        { value: Number(p.warn_max), color: badColor },
      ];
    }

    const p = this._bandedParams();
    return [
      { value: Number(p.min), color: badColor },
      { value: Number(p.fair_min), color: warnColor },
      { value: Number(p.good_min), color: goodColor },
      { value: Number(p.good_max), color: warnColor },
      { value: Number(p.fair_max), color: badColor },
      { value: Number(p.max), color: badColor },
    ];
  }

  _buildTopCardConfig() {
    const secondary =
      this._config.secondary ??
      (this._isAscendingPreset() ? this._secondaryTemplateAscending() : this._secondaryTemplateBanded());

    const color =
      this._config.color ??
      (this._isAscendingPreset() ? this._colorTemplateAscending() : this._colorTemplateBanded());

    const barStyle = this._isAscendingPreset() ? this._barStyleAscending() : this._barStyleBanded();

    const base = {
      type: "custom:mushroom-template-card",
      entity: this._config.entity,
      primary: this._config.name,
      secondary,
      icon: this._config.icon,
      tap_action: { action: "more-info" },
      color,
      features_position: "bottom",
      card_mod: { style: barStyle },
    };

    return { ...base, ...(this._config.mushroom || {}) };
  }

  _buildGraphCardConfig() {
    const base = {
      type: "custom:mini-graph-card",
      entities: [{ entity: this._config.entity }],
      show: {
        name: false,
        legend: false,
        icon: false,
        labels: false,
        extrema: false,
        average: false,
        state: false,
        fill: false,
      },
      color_thresholds_transition: "smooth",
      line_width: this._config.line_width,
      height: this._config.graph_height,
      hours_to_show: this._config.hours_to_show,
      icon: this._config.icon,
      name: this._config.name,
      color_thresholds: this._graphThresholdsByPreset(),
      card_mod: { style: this._miniGraphResetStyle() },
    };

    return { ...base, ...(this._config.graph || {}) };
  }

  async _render() {
    if (!this._config) return;
    const helpers = await this._getHelpers();

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { padding:0; overflow:hidden; }
        .stack { display:flex; flex-direction:column; gap:0; }
        .divider {
          height:1px;
          background: var(--divider-color, rgba(255,255,255,0.12));
          opacity:.6;
          margin: 0 16px;
        }
      </style>
      <ha-card>
        <div class="stack" id="stack"></div>
      </ha-card>
    `;

    const stack = this.shadowRoot.getElementById("stack");
    stack.innerHTML = "";

    const topConf = this._buildTopCardConfig();
    this._top = helpers.createCardElement(topConf);
    this._top.addEventListener("ll-rebuild", (e) => {
      e.stopPropagation();
      this._render();
    });
    stack.appendChild(this._top);

    if (this._config.show_graph) {
      const div = document.createElement("div");
      div.className = "divider";
      stack.appendChild(div);

      const graphConf = this._buildGraphCardConfig();
      this._graph = helpers.createCardElement(graphConf);
      this._graph.addEventListener("ll-rebuild", (e) => {
        e.stopPropagation();
        this._render();
      });
      stack.appendChild(this._graph);
    } else {
      this._graph = null;
    }

    if (this._hass) this.hass = this._hass;
  }
}

customElements.define(CARD_TYPE, Jp2AirQualityCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: CARD_DESC,
});

console.info(
  `%c ${CARD_NAME} %c v${__BUILD_VERSION__} `,
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);
