# JP2 Air Quality Card

> **Version** : v2.0.10 (build 2026-02-15)  
> **Type Lovelace** : `custom:jp2-air-quality` *(alias : `custom:jp2-air-quality-card`)*  
> **Fichier** : **`jp2-air-quality.js`** *(le nom doit rester identique)*

Cette carte Home Assistant affiche un capteur “qualité de l’air” sous deux modes :

- **Mode `sensor`** : une carte pour **1 capteur** (radon, CO₂, TVOC, PM, température, humidité, pression…).  
  Elle calcule un **statut** (*bon / moyen / mauvais*) via des **presets** (seuils intégrés), affiche une **barre** + un **repère**, et un **mini graphe historique** (via l’API d’historique HA).
- **Mode `aqi`** : une carte “AQI” qui agrège **plusieurs capteurs** (liste verticale ou tuiles horizontales), calcule un **statut global** (capteur le plus “pire”), et propose des **overrides** par capteur.

---

## Installation

### 1) Copier le fichier
Place `jp2-air-quality.js` dans ton dossier HA, typiquement :

- `/config/www/jp2-air-quality.js`

### 2) Ajouter la ressource Lovelace
Dans Home Assistant : **Paramètres → Tableaux de bord → Ressources** :

- URL : `/local/jp2-air-quality.js`
- Type : **Module**

### 3) Ajouter la carte dans Lovelace
Dans un tableau de bord, ajoute une carte “Manuelle” (ou via l’éditeur) :

```yaml
type: custom:jp2-air-quality
entity: sensor.mon_capteur
preset: co2
name: Qualité de l'air (CO₂)
```

> Astuce : l’éditeur visuel est intégré (`jp2-air-quality-editor`). Tu peux configurer la plupart des options sans YAML.

---

## Modes de carte

### Mode `sensor` (par défaut)

Affiche un capteur + statut + barre + historique.

**Configuration minimale :**
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
```

### Mode `aqi`

Agrège une liste de capteurs.

**Configuration minimale :**
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
  - sensor.temperature_salon
  - sensor.humidity_salon
```

---

## Presets intégrés

Les presets fournissent :
- un **profil** (`rising` ou `band`),
- une **unité fallback** (si le capteur n’a pas d’unité),
- une plage **min/max** (mise à l’échelle de la barre + graphe),
- des **seuils** et des **labels**.

### Liste des presets disponibles

| Preset | Profil | Unité | Min → Max | Seuils | Labels |
|---|---|---:|---:|---|---|
| `radon` | `rising` | Bq/m³ | 0 → 400 | bon ≤ 99 ; moyen ≤ 299 ; sinon mauvais | Bon / Moyen / Mauvais |
| `co2` | `rising` | ppm | 400 → 2000 | bon ≤ 800 ; moyen ≤ 1000 ; sinon mauvais | Bon / À aérer / Élevé |
| `voc` | `rising` | ppb | 0 → 3000 | bon ≤ 250 ; moyen ≤ 2000 ; sinon mauvais | Faible / À ventiler / Très élevé |
| `pm1` | `rising` | µg/m³ | 0 → 100 | bon ≤ 10 ; moyen ≤ 25 ; sinon mauvais | Bon / Moyen / Mauvais |
| `pm25` | `rising` | µg/m³ | 0 → 150 | bon ≤ 12.0 ; moyen ≤ 35.4 ; sinon mauvais | Bon / Moyen / Mauvais |
| `temperature` | `band` | °C | 0 → 35 | mauvais <16 ; moyen 16–18 ; bon 18–24 ; moyen 24–26 ; mauvais >26 | Confort / À surveiller / Alerte |
| `humidity` | `band` | % | 0 → 100 | mauvais <30 ; moyen 30–40 ; bon 40–60 ; moyen 60–70 ; mauvais >70 | Confort / À surveiller / Inconfort |
| `pressure` | `band` | hPa | 950 → 1050 | mauvais <970 ; moyen 970–980 ; bon 980–1030 ; moyen 1030–1040 ; mauvais >1040 | Normal / Variable / Extrême |

### Détection automatique (surtout utile en mode `aqi`)
En mode `aqi`, la carte tente de **détecter le preset** via :
- `device_class` (température, humidité, pression, CO₂, VOC…),
- l’unité (`ppm`, `ppb`, `°C`, `%`, `hPa`, `µg/m³`, `Bq/m³`),
- le nom de l’entité (contient `co2`, `tvoc`, `pm25`, `radon`, `temp`, `humid`, etc.)

---

## Preset personnalisé (capteur libre)

Si ton capteur ne correspond à aucun preset (ou si tu veux des seuils sur-mesure) :

- mets `preset: custom`
- configure `custom_preset`.

> Dans l’éditeur, lorsque **Configuration → Preset → “Personnalisé (capteur libre)”** est sélectionné, l’accordéon **“Preset personnalisé”** apparaît automatiquement.

### Profil `rising` (plus la valeur monte, plus c’est mauvais)
```yaml
type: custom:jp2-air-quality
entity: sensor.formaldehyde
preset: custom
name: Formaldéhyde
icon: mdi:flask
custom_preset:
  type: rising
  unit_fallback: "µg/m³"
  decimals: 0
  min: 0
  max: 250
  good_max: 50
  warn_max: 100
  label_good: OK
  label_warn: Attention
  label_bad: Alerte
```

Règle :
- **bon** si `value ≤ good_max`
- **moyen** si `value ≤ warn_max`
- **mauvais** au-delà

### Profil `band` (zone de confort au milieu)
```yaml
type: custom:jp2-air-quality
entity: sensor.humidity_cave
preset: custom
name: Hygro cave
custom_preset:
  type: band
  unit_fallback: "%"
  decimals: 0
  min: 0
  max: 100
  warn_low_min: 40
  good_min: 50
  good_max_band: 60
  warn_high_max: 70
  label_good: Confort
  label_warn: À surveiller
  label_bad: Inconfort
```

Règle :
- **bon** dans `[good_min … good_max_band]`
- **moyen** dans `[warn_low_min … good_min[` et `]good_max_band … warn_high_max]`
- **mauvais** hors de ces zones

> Compatibilité : en `band`, tu peux aussi utiliser `good_max` et `warn_max` en alias (la carte les remappe).

---

## Configuration complète

Toutes les clés ci-dessous existent dans la carte (avec leurs valeurs par défaut).

### Clé racine

| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `card_mode` | string | `sensor` | `sensor` ou `aqi` |

---

## Mode `sensor` — options

### Source + preset
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `entity` | string | `""` | Entité HA (ex: `sensor.co2_salon`) |
| `preset` | string | `radon` | Un des presets (`radon`, `co2`, `voc`, `pm1`, `pm25`, `temperature`, `humidity`, `pressure`, `custom`) |
| `custom_preset` | object | `{}` | Présent uniquement si `preset: custom` |

### En-tête / affichage
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `name` | string | selon preset | Titre affiché (fallback sur `friendly_name`) |
| `icon` | string | selon preset | Icône MDI |
| `show_top` | bool | `true` | Affiche l’en-tête |
| `show_title` | bool | `true` | Affiche le titre |
| `show_secondary` | bool | `true` | Affiche la ligne secondaire (valeur/unité/statut) |
| `show_secondary_value` | bool | `true` | Valeur dans le secondaire |
| `show_secondary_unit` | bool | `true` | Unité dans le secondaire |
| `show_secondary_state` | bool | `true` | Statut (Bon/Moyen/Mauvais…) dans le secondaire |
| `show_icon` | bool | `true` | Affiche l’icône |
| `show_value` | bool | `true` | Affiche la valeur principale |
| `show_unit` | bool | `true` | Affiche l’unité principale |

### Fond, icône et repère
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `background_enabled` | bool | `false` | Fond coloré (selon statut) |
| `bar_enabled` | bool | `true` | Affiche la barre de seuils |
| `show_knob` | bool | `true` | Affiche le repère sur la barre |
| `knob_size` | number | `12` | Taille du repère (px) |
| `knob_outline` | bool | `true` | Contour du repère |
| `knob_outline_size` | number | `2` | Taille contour (px) |
| `knob_shadow` | bool | `true` | Ombre sur le repère |
| `knob_color_mode` | string | `theme` | `theme` (couleur du thème) ou `status` (couleur du statut) |
| `icon_size` | number | `40` | Taille conteneur icône (px) |
| `icon_inner_size` | number | `22` | Taille icône MDI (px) |
| `icon_background` | bool | `true` | Pastille de fond derrière l’icône |
| `icon_circle` | bool | `true` | Cercle (contour) autour de l’icône |

### Typographie
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `title_size` | number | `16` | Taille titre (px) |
| `value_size` | number | `18` | Taille valeur (px) |
| `unit_size` | number | `12` | Taille unité (px) |
| `secondary_value_size` | number | `12` | Taille valeur secondaire |
| `secondary_unit_size` | number | `12` | Taille unité secondaire |
| `secondary_state_size` | number | `12` | Taille statut secondaire |

### Graphe interne (mini historique)
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `show_graph` | bool | `true` | Affiche le mini graphe |
| `graph_position` | string | `below_top` | `below_top`, `inside_top`, `top`, `bottom` |
| `hours_to_show` | number | `24` | Fenêtre d’historique (1–168 h) |
| `graph_height` | number | `42` | Hauteur (px) |
| `line_width` | number | `2` | Épaisseur du tracé |
| `graph_color_mode` | string | `segments` | `single` (une couleur), `peaks` (pics colorés), `segments` (segments colorés) |
| `graph_color` | string | `""` | Couleur “bonne” (sinon thème) |
| `graph_warn_color` | string | `""` | Couleur “moyen” (sinon bar.warn) |
| `graph_bad_color` | string | `""` | Couleur “mauvais” (sinon bar.bad) |

### Visualizer (plein écran)
S’ouvre au clic sur le mini graphe (si activé).

| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `visualizer_enabled` | bool | `true` | Active le mode plein écran |
| `visualizer_ranges` | string | `6,12,24,72,168` | Raccourcis (en heures). Séparateurs acceptés : virgule, point-virgule, espaces |
| `visualizer_show_stats` | bool | `true` | Affiche statistiques (min/max/moyenne) |
| `visualizer_show_thresholds` | bool | `true` | Affiche les seuils |
| `visualizer_smooth_default` | bool | `false` | Lissage par défaut |

> Raccourcis : valeurs acceptées **1 à 720** heures (max 12 valeurs uniques).

### Barre des seuils
Objet `bar` :

| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `bar.align` | string | `center` | `left`, `center`, `right` (accepte aussi `gauche`/`droite`) |
| `bar.width` | number | `92` | Largeur de la barre (% de la carte) |
| `bar.height` | number | `6` | Hauteur (px) |
| `bar.opacity` | number | `100` | Opacité des segments (0–100) |
| `bar.good` | string | `#45d58e` | Couleur segment bon |
| `bar.warn` | string | `#ffb74d` | Couleur segment moyen |
| `bar.bad` | string | `#ff6363` | Couleur segment mauvais |

---

## Mode `aqi` — options

### Base
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_title` | string | `AQI` | Titre |
| `aqi_title_icon` | string | `""` | Icône MDI optionnelle dans le titre |
| `aqi_entities` | list | `[]` | Liste d’entités (strings) |
| `aqi_overrides` | object | `{}` | Overrides par entité : `{ "sensor.xxx": { name, icon } }` |

### Affichage général
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_show_title` | bool | `true` | Affiche le titre |
| `aqi_show_global` | bool | `true` | Affiche le statut global |
| `aqi_show_sensors` | bool | `true` | Affiche la liste/tuiles capteurs |
| `aqi_air_only` | bool | `false` | Si `true`, le global ignore température/humidité/pression |

### Layout
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_layout` | string | `vertical` | `vertical` (liste) ou `horizontal` (tuiles) |
| `aqi_tiles_per_row` | number | `3` | Nombre de tuiles par ligne (mode horizontal) |
| `aqi_tiles_icons_only` | bool | `false` | Tuiles “icônes seulement” (compact) |
| `aqi_tile_color_enabled` | bool | `false` | Teinte la tuile selon le statut |
| `aqi_tile_transparent` | bool | `false` | Fond transparent des tuiles |
| `aqi_tile_outline_transparent` | bool | `false` | Contour transparent des tuiles |
| `aqi_tile_radius` | number | `16` | Rayon (px) |

### Contenu des lignes/capteurs
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_show_sensor_icon` | bool | `true` | Icône |
| `aqi_show_sensor_name` | bool | `true` | Nom |
| `aqi_show_sensor_entity` | bool | `false` | Affiche l’entity_id |
| `aqi_show_sensor_value` | bool | `true` | Valeur |
| `aqi_show_sensor_unit` | bool | `true` | Unité |
| `aqi_show_sensor_status` | bool | `true` | Statut (dot + texte) |

### Typographie AQI (0 = auto)
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_text_name_size` | number | `0` | Taille nom |
| `aqi_text_name_weight` | number | `0` | Graisse nom |
| `aqi_text_value_size` | number | `0` | Taille valeur |
| `aqi_text_value_weight` | number | `0` | Graisse valeur |
| `aqi_text_unit_size` | number | `0` | Taille unité |
| `aqi_text_unit_weight` | number | `0` | Graisse unité |
| `aqi_text_status_size` | number | `0` | Taille statut |
| `aqi_text_status_weight` | number | `0` | Graisse statut |

### Style des icônes capteurs (AQI)
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_icon_size` | number | `34` | Taille icône (px) |
| `aqi_icon_inner_size` | number | `18` | Taille MDI interne (px) |
| `aqi_icon_background` | bool | `true` | Fond |
| `aqi_icon_circle` | bool | `true` | Contour |
| `aqi_icon_color_mode` | string | `colored` | `colored` (couleur statut) ou `transparent` (couleur thème) |

### Statut global (dot + texte)
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_global_status_enabled` | bool | `true` | Active la ligne global |
| `aqi_global_status_show_dot` | bool | `true` | Dot |
| `aqi_global_status_show_text` | bool | `true` | Texte |
| `aqi_global_status_dot_size` | number | `10` | Taille dot |
| `aqi_global_status_dot_outline` | number | `1` | Outline dot |
| `aqi_global_status_text_size` | number | `0` | Taille texte (0 = auto) |
| `aqi_global_status_text_weight` | number | `0` | Graisse texte (0 = auto) |

### SVG global (icône “qualité” au-dessus du statut)
| Clé | Type | Défaut | Description |
|---|---:|---:|---|
| `aqi_global_svg_enabled` | bool | `false` | Active le SVG global |
| `aqi_global_svg_size` | number | `52` | Taille |
| `aqi_global_svg_color_mode` | string | `status` | `status` ou `custom` |
| `aqi_global_svg_color` | string | `""` | Couleur si `custom` |
| `aqi_global_svg_show_icon` | bool | `true` | Affiche le SVG |
| `aqi_global_svg_background` | bool | `true` | Fond cercle |
| `aqi_global_svg_background_color_mode` | string | `status` | `status` ou `custom` |
| `aqi_global_svg_background_color` | string | `""` | Couleur fond si `custom` |
| `aqi_global_svg_background_opacity` | number | `12` | Opacité fond (%) |
| `aqi_global_svg_circle` | bool | `true` | Contour cercle |
| `aqi_global_svg_circle_width` | number | `1` | Épaisseur contour |
| `aqi_global_svg_circle_color_mode` | string | `status` | `status` ou `custom` |
| `aqi_global_svg_circle_color` | string | `""` | Couleur contour si `custom` |

---

# Exemples (plein de variantes)

## 1) Carte CO₂ “simple et efficace”
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
name: Salon – CO₂
```

## 2) Même carte, avec fond coloré + repère couleur statut
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
background_enabled: true
knob_color_mode: status
```

## 3) Carte température (zone de confort) + graphe en bas
```yaml
type: custom:jp2-air-quality
entity: sensor.temperature_salon
preset: temperature
graph_position: bottom
hours_to_show: 48
```

## 4) Carte humidité sans secondaire (ultra minimal)
```yaml
type: custom:jp2-air-quality
entity: sensor.humidity_salon
preset: humidity
show_secondary: false
```

## 5) Bar alignée à gauche + plus fine + plus large
```yaml
type: custom:jp2-air-quality
entity: sensor.radon
preset: radon
bar:
  align: left
  width: 100
  height: 4
  opacity: 85
```

## 6) Couleurs de seuils personnalisées (bar + graphe “segments”)
```yaml
type: custom:jp2-air-quality
entity: sensor.pm25_salon
preset: pm25
graph_color_mode: segments
bar:
  good: "#2ecc71"
  warn: "#f1c40f"
  bad: "#e74c3c"
```

## 7) Graphe monochrome (mode `single`)
```yaml
type: custom:jp2-air-quality
entity: sensor.tvoc_salon
preset: voc
graph_color_mode: single
graph_color: "var(--primary-color)"
```

## 8) Graphe avec “pics” colorés (mode `peaks`)
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
graph_color_mode: peaks
graph_warn_color: "#ff9800"
graph_bad_color: "#f44336"
```

## 9) Désactiver le visualizer (pas de plein écran au clic)
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
visualizer_enabled: false
```

## 10) Visualizer avec des raccourcis personnalisés
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
visualizer_ranges: "3, 6, 12, 24, 36, 72, 168"
visualizer_show_stats: true
visualizer_show_thresholds: true
visualizer_smooth_default: true
```

## 11) Grosse typo (dashboard mural)
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
title_size: 18
value_size: 34
unit_size: 14
secondary_value_size: 14
secondary_unit_size: 14
secondary_state_size: 14
icon_size: 52
icon_inner_size: 28
graph_height: 60
```

## 12) Carte “valeur uniquement” (sans icône ni titre)
```yaml
type: custom:jp2-air-quality
entity: sensor.co2_salon
preset: co2
show_icon: false
show_title: false
show_secondary: false
bar_enabled: false
show_graph: false
value_size: 42
unit_size: 14
```

## 13) Preset personnalisé `rising` : un capteur “indice odeur”
```yaml
type: custom:jp2-air-quality
entity: sensor.odor_index
preset: custom
name: Odeurs
custom_preset:
  type: rising
  unit_fallback: "%"
  decimals: 0
  min: 0
  max: 100
  good_max: 30
  warn_max: 60
  label_good: OK
  label_warn: À ventiler
  label_bad: Fort
```

## 14) Preset personnalisé `band` : “zone cible” (ex: humidité idéale serre)
```yaml
type: custom:jp2-air-quality
entity: sensor.humidity_greenhouse
preset: custom
name: Serre – humidité
custom_preset:
  type: band
  unit_fallback: "%"
  decimals: 0
  min: 0
  max: 100
  warn_low_min: 45
  good_min: 55
  good_max_band: 70
  warn_high_max: 80
  label_good: Top
  label_warn: Limite
  label_bad: Hors zone
```

---

# Exemples AQI (multi-capteurs)

## 15) AQI vertical (liste) – statut global + capteurs
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_title: Air intérieur
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
  - sensor.temperature_salon
  - sensor.humidity_salon
```

## 16) AQI “Air only” (ignore temp/humidité/pression pour le global)
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_air_only: true
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
  - sensor.temperature_salon
  - sensor.humidity_salon
  - sensor.pressure_salon
```

## 17) AQI horizontal (tuiles) 4 par ligne + tuiles colorées
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_layout: horizontal
aqi_tiles_per_row: 4
aqi_tile_color_enabled: true
aqi_tile_radius: 18
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
  - sensor.temperature_salon
  - sensor.humidity_salon
```

## 18) AQI tuiles “icônes seulement” (super compact)
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_layout: horizontal
aqi_tiles_per_row: 5
aqi_tiles_icons_only: true
aqi_tile_color_enabled: true
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
  - sensor.temperature_salon
  - sensor.humidity_salon
```

## 19) Renommer/Changer l’icône de certains capteurs (overrides)
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
aqi_overrides:
  sensor.co2_salon:
    name: CO₂
    icon: mdi:molecule-co2
  sensor.tvoc_salon:
    name: TVOC
    icon: mdi:air-filter
  sensor.pm25_salon:
    name: PM2.5
    icon: mdi:weather-hazy
```

## 20) Icônes AQI “neutres” (couleur thème), sans fond
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_icon_color_mode: transparent
aqi_icon_background: false
aqi_icon_circle: false
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
```

## 21) Changer la typographie AQI (tout en “auto” par défaut)
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_text_name_size: 13
aqi_text_name_weight: 700
aqi_text_value_size: 18
aqi_text_value_weight: 900
aqi_text_unit_size: 11
aqi_text_status_size: 12
aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
```

## 22) SVG global + couleurs custom
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_global_svg_enabled: true
aqi_global_svg_size: 64

aqi_global_svg_color_mode: custom
aqi_global_svg_color: "#ffffff"

aqi_global_svg_background: true
aqi_global_svg_background_color_mode: custom
aqi_global_svg_background_color: "#2196f3"
aqi_global_svg_background_opacity: 18

aqi_global_svg_circle: true
aqi_global_svg_circle_width: 2
aqi_global_svg_circle_color_mode: custom
aqi_global_svg_circle_color: "rgba(255,255,255,.65)"

aqi_entities:
  - sensor.co2_salon
  - sensor.tvoc_salon
  - sensor.pm25_salon
```

## 23) Global minimal (dot seulement, sans texte)
```yaml
type: custom:jp2-air-quality
card_mode: aqi
aqi_global_status_show_text: false
aqi_global_status_dot_size: 14
aqi_entities:
  - sensor.co2_salon
  - sensor.pm25_salon
  - sensor.tvoc_salon
```

---

## Combiner avec d’autres cartes (stacks / grid)

### 24) “Tableau” avec 3 cartes capteurs
```yaml
type: grid
columns: 3
square: false
cards:
  - type: custom:jp2-air-quality
    entity: sensor.co2_salon
    preset: co2
  - type: custom:jp2-air-quality
    entity: sensor.pm25_salon
    preset: pm25
  - type: custom:jp2-air-quality
    entity: sensor.tvoc_salon
    preset: voc
```

### 25) En colonne, avec un AQI global au-dessus
```yaml
type: vertical-stack
cards:
  - type: custom:jp2-air-quality
    card_mode: aqi
    aqi_air_only: true
    aqi_layout: horizontal
    aqi_tiles_per_row: 5
    aqi_tile_color_enabled: true
    aqi_entities:
      - sensor.co2_salon
      - sensor.tvoc_salon
      - sensor.pm25_salon
      - sensor.temperature_salon
      - sensor.humidity_salon
  - type: custom:jp2-air-quality
    entity: sensor.radon
    preset: radon
    background_enabled: true
```

---

# Interactions

- **Clic sur l’en-tête (mode sensor)** : ouvre le panneau “plus d’infos” Home Assistant de l’entité (`hass-more-info`).
- **Clic sur le mini-graphe (mode sensor)** : ouvre le **visualizer** plein écran (si `visualizer_enabled: true` et `show_graph: true`).
  - **ESC** pour fermer.
- **Clic sur une ligne / tuile (mode aqi)** : ouvre “plus d’infos” du capteur correspondant.

---

# Dépannage / FAQ

### “Entité introuvable”
- Vérifie `entity:` (orthographe, domaine `sensor.`…)
- Vérifie que l’entité existe dans **Outils de développement → États**.

### “Historique indisponible”
Le graphe utilise l’API `history/period` de Home Assistant :
- Si l’entité n’a pas d’historique (Recorder désactivé, entité exclue, base purgée), le graphe ne peut pas s’afficher.
- Si l’état n’est pas numérique (ex: `unknown`, `unavailable`, texte…), la carte ne peut pas tracer.

### Le statut ne correspond pas à tes seuils
- Vérifie `preset:` (ou utilise `preset: custom`).
- Vérifie les unités (ex: ppm / ppb / µg/m³).
- En `custom_preset`, vérifie `min < max` et l’ordre des seuils (la carte “sanitise” si incohérent).

### Je veux un look plus compact
- Réduis `icon_size`, `value_size`, `graph_height`, et/ou désactive :
  - `show_secondary`, `show_graph`, `bar_enabled`.

---

# Notes techniques (utile pour dev)

- La carte met en cache l’historique 60s par entité/fenêtre (`entityId|hours`) pour éviter de spammer l’API.
- `hours_to_show` est borné à **1–168** heures (mini graphe).
- `visualizer_ranges` accepte jusqu’à **12** valeurs uniques, de **1 à 720** heures.
- Les couleurs “good/warn/bad” viennent de `bar.good/warn/bad` (avec fallback).

---

## Changelog (extrait)

- **v2.0.10** : ajout du **preset personnalisé** (capteur libre) + accordéon “Preset personnalisé” dans l’éditeur.
- **v2.0.9** : correction UI editor (accordéons, focus).
- **v2.0.8** : accordéons par bloc dans l’éditeur.

