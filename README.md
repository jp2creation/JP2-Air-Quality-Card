# JP2 Air Quality

Custom Lovelace card that renders a **Mushroom Template Card** + **mini-graph-card** inside one card,
with a **threshold bar + cursor** and a **full Visual Editor** (UI editor).

## Features
- Presets:
  - `radon` (ascendant vert/orange/rouge)
  - `voc` (COV/TVOC) (ascendant)
  - `pm1` (ascendant)
  - `pm25` (ascendant)
  - `pressure` (rouge/orange/vert/orange/rouge)
  - `humidity` (rouge/orange/vert/orange/rouge)
  - `temperature` (rouge/orange/vert/orange/rouge)
- Optional graph (mini-graph-card)
- Threshold bar/cursor via `card-mod`
- Visual editor via `getConfigForm()`
- Advanced overrides:
  - `secondary` (template)
  - `color` (template)
  - `mushroom` (YAML object merged into mushroom card)
  - `graph` (YAML object merged into mini-graph-card)
  - `name_by_preset`, `icon_by_preset` (global mapping overrides)

## Requirements (HACS)
Install:
- Mushroom
- mini-graph-card
- card-mod

## Install (HACS)
1. HACS → Frontend → Custom repositories → add this repository as **Plugin**
2. Install
3. Add resource if not auto-added:
   - URL: `/hacsfiles/jp2-air-quality/jp2-air-quality.js`
   - Type: `module`
4. Clear cache / CTRL+F5

## Usage

### Radon
```yaml
type: custom:jp2-air-quality
preset: radon
entity: sensor.wave_plus_couloir_radon
name: Radon
```

### VOC / TVOC
```yaml
type: custom:jp2-air-quality
preset: voc
entity: sensor.wave_plus_couloir_voc
name: COV
```

### PM2.5
```yaml
type: custom:jp2-air-quality
preset: pm25
entity: sensor.air_pm2_5
name: PM2.5
pm25:
  good_max: 12
  warn_max: 35.4
```

### Pressure
```yaml
type: custom:jp2-air-quality
preset: pressure
entity: sensor.pression_exterieure
name: Pression
pressure:
  offset: 27
  min: 970
  max: 1050
  fair_min: 995
  good_min: 1005
  good_max: 1025
  fair_max: 1035
```

## Advanced overrides example
```yaml
type: custom:jp2-air-quality
preset: radon
entity: sensor.wave_plus_couloir_radon

secondary: >
  {% set v = states(entity) | float(none) %}
  {{ '%.0f'|format(v) }} Bq/m³

mushroom:
  hold_action:
    action: navigate
    navigation_path: /lovelace/air

graph:
  hours_to_show: 48
  points_per_hour: 2
```


## Threshold bar options
```yaml
type: custom:jp2-air-quality
preset: pm25
entity: sensor.air_pm2_5
bar:
  enabled: true        # show/hide bar
  height: 8            # track height in px
  padding: 16          # left/right padding in px
  bottom: 8            # distance from bottom in px
  thumb_size: 12       # cursor size
  thumb_border_width: 2
  thumb_border_color: "rgba(0,0,0,0.85)"
  track_good: "rgba(0,200,83,0.30)"
  track_warn: "rgba(255,193,7,0.30)"
  track_bad:  "rgba(244,67,54,0.30)"
  fill_good:  "rgba(0,200,83,0.95)"
  fill_warn:  "rgba(255,193,7,0.95)"
  fill_bad:   "rgba(244,67,54,0.95)"
  fill_none:  "rgba(180,190,200,0.55)"
graph_colors_from_bar: true
```

## Troubleshooting
- "Custom element doesn’t exist": verify resource URL is correct and type is `module`, then CTRL+F5.
- Bar/cursor not visible: `card-mod` is required.

## License
MIT
