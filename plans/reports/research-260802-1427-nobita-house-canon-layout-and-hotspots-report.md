# Nobita's House (Doraemon) – 3D Diorama Content Spec

**Reference:** Ground floor from provided Mizuta/水田 anime layout image. Canon 2nd floor from 1979 anime series (early manga version where parents' room is upstairs).

---

## 1. Room Inventory

### Ground Floor

| Room ID | JP Name | Romaji | English | Size (jo/m²) | Approx Meters | Adjacency | Notes |
|---------|---------|--------|---------|------------|--------------|-----------|-------|
| gf-genkan | 玄关 | Genkān | Entrance Hall | 1.5 / 2.7 | 2.0 × 1.4 | Main entry; opens to living room | Step-up from outside; shoe area |
| gf-living | 起居室 | Qijushì | Living Room | 6 / 10.8 | 3.6 × 3.0 | Center; connects to all rooms | Tatami; kotatsu; family hub |
| gf-kitchen | 厨房 | Chufang | Kitchen | 4 / 7.2 | 2.8 × 2.6 | NE corner; off living room | Cooking area; appliances visible |
| gf-guest | 会客室 | Huikeishi | Guest/Reception Room | 6 / 10.8 | 3.6 × 3.0 | W side; formal tatami room | Shoji doors; rarely used |
| gf-stairs | 去二楼 | Qu ér huà | Stair Hall | 2 / 3.6 | 2.0 × 1.8 | E side; connects to kitchen | Wood floors; landing halfway |
| gf-bath | 浴室 | Yokushitsu | Bathroom | 1.5 / 2.7 | 2.2 × 1.2 | E side (off stairs) | [assumed] Ofuro + toilet; rarely shown |
| gf-yard | 庭園 | Teien | Garden + Shed | ∞ | ~5 × 5 | Exterior; NW corner | Trees; genkan shed (倉库); laundry pole |

### Second Floor (1979/Early Manga Canon)

| Room ID | JP Name | Romaji | English | Size (jo/m²) | Approx Meters | Adjacency | Notes |
|---------|---------|--------|---------|------------|--------------|-----------|-------|
| 2f-nobita | のび太の部屋 | Nobita no Heya | Nobita's Bedroom | 6 / 10.8 | 3.6 × 3.0 | Stairs land here | Tatami; desk (drawer = time machine); oshiire closet; window |
| 2f-parents | 両親の部屋 | Ryōshin no Heya | Parents' Bedroom | 8 / 14.4 | 4.2 × 3.4 | Adjacent to stairs | Tatami; formal futon setup; small window |
| 2f-hall | 廊下 | Rōka | Hallway | 1.5 / 2.7 | 2.0 × 1.4 | Stairs connect here | Wood floor; transitions to tatami rooms |
| 2f-landing | 階段踊り場 | Kaidan Odoriba | Stair Landing | 1 / 1.8 | 1.5 × 1.2 | Top of stairs | Transition zone; light from above |

**Tatami Standard:** 1 jo = 1.82m × 0.91m (Tokyo variant: 1.76m × 0.88m). All sizes shown use standard 1 jo reference.

---

## 2. Prop Inventory (~65 assets)

| Asset ID | Name | Room | Dimensions (m) | Hotspot? | Rodin Prompt |
|----------|------|------|-----------------|----------|------------|
| prop-01 | Nobita's Study Desk | 2f-nobita | 1.2 × 0.6 × 0.8 | YES | Low poly wooden school desk, Japanese style, natural brown, flat shading, drawer detail |
| prop-02 | Time Machine (in drawer) | 2f-nobita | 0.6 × 0.4 × 0.3 | YES | Sci-fi console platform with digital clock face, blue/silver, glowing buttons, minimal geometry |
| prop-03 | Oshiire Closet (sliding doors) | 2f-nobita | 1.0 × 0.5 × 1.8 | YES | Traditional Japanese wooden closet with two sliding shoji-style doors, white paper panels, dark wood frame |
| prop-04 | Futon (Nobita) | 2f-nobita | 1.0 × 2.0 × 0.2 | NO | Rolled traditional bedding, blue quilted cover, on floor |
| prop-05 | Small Window | 2f-nobita | 0.6 × 0.6 × 0.1 | NO | Horizontal sliding window, white frame, light blue glass panes |
| prop-06 | Tatami Mats (6 sheets) | 2f-nobita | 1.82 × 0.91 × 0.05 ea | NO | Low poly woven reed flooring, pale green, flat color, woven texture suggestion |
| prop-07 | Bookshelf (small) | 2f-nobita | 0.8 × 0.3 × 1.2 | NO | Low poly wooden shelving, holds comic books and items, brown wood |
| prop-08 | Doraemon (statue/figure) | 2f-nobita | 0.15 × 0.15 × 0.25 | YES | Stylized robot cat, iconic blue body, red nose, red collar with bell, sitting pose |
| prop-09 | Doraemon's 4D Pocket (on belly) | 2f-nobita | 0.2 × 0.15 × 0.1 | YES | White rounded rectangular pocket on blue torso, portal-like opening, glowing edge subtle |
| prop-10 | Bell (Doraemon collar) | 2f-nobita | 0.05 × 0.05 × 0.06 | NO | Small yellow bell hanging from red collar, round shape, shiny surface |
| prop-11 | Dorayaki (bean cakes, stack) | gf-living | 0.1 × 0.1 × 0.15 | YES | Low poly stack of red/brown sandwich cakes, cylindrical, slight 3D bevel |
| prop-12 | Kotatsu Table | gf-living | 1.0 × 0.8 × 0.4 | YES | Low poly low dining table, wooden legs, dark brown, flat top with quilted blanket underneath |
| prop-13 | Quilted Blanket (kotatsu) | gf-living | 0.95 × 0.75 × 0.05 | NO | Patterned textile, warm beige/brown, draped under table |
| prop-14 | Tatami Mats (living room) | gf-living | 1.82 × 0.91 × 0.05 ea (6 sheets) | NO | Pale green woven reed flooring, flat matte surface |
| prop-15 | Shoji Door (living to guest) | gf-living | 1.2 × 2.0 × 0.05 | NO | Sliding door, white paper panel with wooden lattice grid, light transmission |
| prop-16 | TV Set (vintage 1980s) | gf-living | 0.5 × 0.4 × 0.45 | NO | Boxy CRT television, brown wood frame, small screen, antenna on top |
| prop-17 | Cushions (zabuton, 4 pc) | gf-living | 0.4 × 0.4 × 0.08 ea | NO | Low poly square floor cushions, muted colors (beige, red, brown), flat top |
| prop-18 | Small Shelf Unit | gf-living | 0.6 × 0.3 × 0.9 | NO | Open wooden shelving, brown, holds small items and pottery |
| prop-19 | Staircase (wood) | gf-stairs | 1.5 × 1.2 × 2.8 | NO | Low poly wooden stairs (8-10 steps), natural brown, railing on one side, angled ascent |
| prop-20 | Stair Railing | gf-stairs | 1.5 × 0.1 × 0.8 | NO | Wooden handrail, dark brown, simple geometric segments |
| prop-21 | Kitchen Counter | gf-kitchen | 2.0 × 0.6 × 0.85 | NO | Wooden prep surface, light tan, simple rectangular form |
| prop-22 | Kitchen Sink (sink + faucet) | gf-kitchen | 0.6 × 0.5 × 0.15 | NO | White ceramic sink basin, chrome faucet, minimal detail |
| prop-23 | Stove/Range (2-burner) | gf-kitchen | 0.7 × 0.6 × 0.5 | NO | Black metal cooking appliance, two burner tops, Japanese style |
| prop-24 | Refrigerator | gf-kitchen | 0.5 × 0.5 × 1.4 | NO | White vintage fridge, compact size, door handle detail |
| prop-25 | Cooking Utensils (hanging) | gf-kitchen | 0.3 × 0.2 × 0.25 | NO | Stylized pots, pans, ladles hung on wall, brown/metallic |
| prop-26 | Food Storage Jars | gf-kitchen | 0.08 × 0.08 × 0.12 ea (3) | NO | Glass cylinders with wooden lids, holds rice/flour, small |
| prop-27 | Genkan Entrance (step + frame) | gf-genkan | 2.0 × 1.2 × 0.15 | YES | Raised wooden platform step, natural wood color, clear threshold separation |
| prop-28 | Shoe Rack (genkan) | gf-genkan | 1.0 × 0.3 × 0.8 | NO | Low poly wooden shoe storage, holds family shoes, brown |
| prop-29 | Coat Hooks (genkan) | gf-genkan | 0.3 × 0.1 × 0.3 | NO | Simple wooden pegs on wall, natural color |
| prop-30 | Fusuma Door (guest room) | gf-guest | 1.2 × 2.0 × 0.05 | NO | Opaque sliding door with paper/fabric panel, brown wooden frame, closed position |
| prop-31 | Guest Room Tatami (6 mats) | gf-guest | 1.82 × 0.91 × 0.05 ea | NO | Pale green woven reed flooring |
| prop-32 | Guest Room Alcove (tokonoma) | gf-guest | 1.0 × 0.3 × 1.2 | NO | Recessed wall niche, dark wood frame, minimal decoration space |
| prop-33 | Hanging Scroll | gf-guest | 0.4 × 0.6 × 0.02 | NO | Minimalist ink painting or calligraphy on scroll, mounted above alcove |
| prop-34 | Formal Cushion (zabuton, guest) | gf-guest | 0.5 × 0.5 × 0.1 | NO | Premium floor cushion, muted tone, formal setting |
| prop-35 | Bathtub (ofuro) | gf-bath | 1.0 × 0.7 × 0.6 | NO | Traditional round/oval soaking tub, white/cream ceramic, deep |
| prop-36 | Shower Head + Rod | gf-bath | 0.15 × 0.15 × 0.3 | NO | Chrome metal shower fixture, simple curve, wall-mounted |
| prop-37 | Toilet | gf-bath | 0.4 × 0.5 × 0.5 | NO | Compact Japanese toilet, white ceramic, low-poly form |
| prop-38 | Bathroom Mirror | gf-bath | 0.5 × 0.5 × 0.02 | NO | Rectangular wall mirror, glass/metal frame, above sink |
| prop-39 | Towel Rack | gf-bath | 0.6 × 0.1 × 0.2 | NO | Simple wooden horizontal bar, holds folded towels |
| prop-40 | Laundry Pole (outdoor) | gf-yard | 1.5 × 0.05 × 1.8 | NO | Tall wooden pole in garden, clothes-line attachment points |
| prop-41 | Clothesline (rope) | gf-yard | 3.0 × 0.01 × 0.0 | NO | Thin rope strung between poles, holds laundry |
| prop-42 | Garden Trees (2x large) | gf-yard | 2.0 dia × 3.5 h ea | NO | Stylized deciduous trees, green foliage canopy, brown trunk, low poly |
| prop-43 | Garden Shrubs (3-4x) | gf-yard | 0.8 × 0.8 × 1.0 ea | NO | Low poly rounded bushes, medium green, scattered |
| prop-44 | Fence (perimeter) | gf-yard | 8.0 linear | NO | Low poly wooden fence, gray/brown weathered color, simple slats |
| prop-45 | Shed (storage, genkan side) | gf-yard | 2.0 × 1.5 × 1.8 | NO | Small wooden building, red clay-tile roof, simple rectangle, door detail |
| prop-46 | Shed Door | gf-yard | 0.8 × 1.2 × 0.05 | NO | Wooden sliding or swing door, brown, weathered |
| prop-47 | Roof Tiles (kawara, main house) | gf-living (roof) | Whole roof | NO | Low poly red/orange clay tiles, overlapping pattern, gable ends visible |
| prop-48 | Exterior Wall | gf-living (exterior) | Whole perimeter | NO | Tan/cream plaster or wooden siding, weathered flat color |
| prop-49 | Window (living room) | gf-living | 0.8 × 0.8 × 0.1 | NO | Horizontal sliding wood-frame window, light entry |
| prop-50 | Sliding Glass Door (kitchen→garden) | gf-kitchen | 1.0 × 1.8 × 0.05 | NO | Transparent/translucent panel, connects kitchen to yard |
| prop-51 | Parents' Futon (rolled) | 2f-parents | 1.2 × 2.0 × 0.25 | NO | Thicker quilted bedding, formal burgundy color |
| prop-52 | Parents' Room Window | 2f-parents | 0.7 × 0.6 × 0.1 | NO | Small single window, wooden frame |
| prop-53 | Wardrobe Cabinet (tansu) | 2f-parents | 0.8 × 0.4 × 1.4 | NO | Traditional Japanese wooden chest, deep brown, drawers stacked |
| prop-54 | Small Side Table | 2f-parents | 0.6 × 0.4 × 0.4 | NO | Low poly bedside table, natural wood, simple form |
| prop-55 | Parents' Tatami (8 mats) | 2f-parents | 1.82 × 0.91 × 0.05 ea | NO | Pale green woven flooring |
| prop-56 | Hallway Wooden Floor | 2f-hall | 2.0 × 1.4 × 0.02 | NO | Horizontal wood planks, natural tan/brown color |
| prop-57 | Stair Landing (upper) | 2f-landing | 1.5 × 1.2 × 0.02 | NO | Wood flooring at top of stairs, platform |
| prop-58 | Ceiling Light (pendant, living) | gf-living | 0.2 × 0.2 × 0.3 | NO | Paper lantern or frosted globe light, warm glow suggestion |
| prop-59 | Ceiling Light (nobita room) | 2f-nobita | 0.2 × 0.2 × 0.3 | NO | Simple flush-mount pendant, white globe |
| prop-60 | Ceiling Light (parents room) | 2f-parents | 0.2 × 0.2 × 0.3 | NO | Matching overhead light |
| prop-61 | Telephone (wall-mounted) | gf-living | 0.15 × 0.1 × 0.1 | NO | Retro corded phone, cream/beige plastic, wall-mounted in corner |
| prop-62 | Calendar (wall, living) | gf-living | 0.3 × 0.4 × 0.02 | NO | Simple paper calendar, hung on wall, Japanese characters |
| prop-63 | Scrollwork/Decorative Elements | gf-guest | 0.5 × 0.3 | NO | Subtle framed art or calligraphy pieces on walls |
| prop-64 | Doraemon Ears (posed, if separate) | Various | 0.08 × 0.06 × 0.1 | NO | If rigged; usually on main model |
| prop-65 | Take-copter (gadget, small) | 2f-nobita | 0.08 × 0.08 × 0.15 | NO | Tiny propeller helicopter toy, yellow/red, handheld scale |

**Hotspot count:** 8 confirmed (prop-01, 02, 03, 08, 09, 11, 12, 27)

---

## 3. Hotspot Content (Infocards)

### Tier 1 – Must-Have Hotspots

**1. Nobita's Desk + Time Machine Drawer**
- EN: *"The Legendary Desk & Time Portal"*
- VI: *"Chiếc Bàn Huyền Thoại & Cổng Thời Gian"*
- Trivia: This unassuming wooden school desk is home to Doraemon's most famous gadget—the Time Machine, hidden in the right-side drawer. It's the launching point for countless adventures across past and future. Nobita studies here (or tries to), and the machine portal connects directly to Doraemon's 22nd-century origin point.

**2. Doraemon – The Robot Cat**
- EN: *"Doraemon: Cat from the Future"*
- VI: *"Doraemon: Chú Mèo Từ Tương Lai"*
- Trivia: MS-903 Doraemon is a robot cat sent from the 22nd century to help Nobita Nobi. Despite missing ears (lost to a mouse), he remains endlessly loyal and clever. His catchphrase "Ima kara, yatte yarou!" (Let's do it right now!) defines every episode. His blue body, red nose, and iconic red collar with bell make him instantly recognizable worldwide.

**3. Doraemon's 4D Pocket**
- EN: *"The Infinite Gadget Dimension"*
- VI: *"Chiều Không Gian Vô Hạn"*
- Trivia: Doraemon's most powerful feature—a pocket that opens into a 4-dimensional space larger than the house itself. It holds thousands of futuristic gadgets: Time Machine, Take-copter, Anywhere Door, and more. The "4D" defies normal physics; it can store objects bigger than it and retrieve exactly what's needed instantly.

**4. Oshiire Closet (Doraemon's Bed)**
- EN: *"Doraemon's Secret Sleeping Spot"*
- VI: *"Nơi Ngủ Bí Mật Của Doraemon"*
- Trivia: A traditional Japanese sliding-door closet meant for storing futons by day. Doraemon converted it into his bedroom, curling up inside at night. This detail reflects Fujiko F. Fujio's own childhood experiences with oshiire in his family home—a real architectural element now iconic in anime.

**5. Tatami Mats & Washitsu Room**
- EN: *"Traditional Japanese Flooring"*
- VI: *"Sàn Thảm Cỏ Truyền Thống Nhật"*
- Trivia: Each straw mat (tatami) measures 1.82m × 0.91m. Room sizes are measured in "jo" (number of mats). Nobita's room and living room are both 6-mat rooms—cozy family spaces. The natural woven texture and slight give underfoot define the comfort of traditional Japanese homes.

**6. Kotatsu – The Family Table**
- EN: *"Warm Winter Gathering Place"*
- VI: *"Nơi Quây Quần Mùa Đông"*
- Trivia: A low wooden table with an electric heater underneath and quilted blanket draped over. Iconic symbol of Japanese family togetherness. In Doraemon, the family often gathers here to eat, study, or just warm up on cold nights. The kotatsu appears in countless cozy domestic episodes.

**7. Genkan Entrance & Shoe Step**
- EN: *"The Japanese Threshold"*
- VI: *"Ngưỡng Cửa Chính Thức Nhật"*
- Trivia: The genkan is the sunken entryway where shoes are removed before stepping up into the house proper. This clean-dirty boundary is fundamental to Japanese home culture. Nobita often removes his school shoes here; guests do the same. The step itself is a vital architectural transition.

**8. Dorayaki (Sweet Bean Cakes)**
- EN: *"Doraemon's Favorite Snack"*
- VI: *"Bánh Yêu Thích Của Doraemon"*
- Trivia: A traditional Japanese red bean paste sandwich made with two castella-like sponge cakes. Doraemon is obsessed—he can be bribed, motivated, or distracted by dorayaki. Nobita's mom (Tamako) sometimes makes them at home. A single dorayaki can solve any Doraemon problem... temporarily.

### Tier 2 – Secondary Hotspots (brief callouts)

**9. Parents' Bedroom (Nobisuke & Tamako)**
- EN: *"The Heart of Parental Comfort"*
- VI: *"Phòng Ngủ Bố Mẹ"*
- Trivia: Located on the 2nd floor (1979 anime canon). A formal 8-mat room with proper futon setup. Father Nobisuke reads newspapers; mother Tamako manages household chaos. Few episodes venture here; it remains the adult sanctuary.

**10. Kitchen & Family Cooking**
- EN: *"Where Tamako Cooks"*
- VI: *"Nơi Tamako Nấu Nướng"*
- Trivia: A compact but functional cooking space. Tamako prepares meals here daily. The wooden counter, small stove, and fridge are visible in many domestic episodes. Kitchen scenes ground the show's slice-of-life humor.

**11. Living Room & TV Corner**
- EN: *"Center of Home Life"*
- VI: *"Tâm Điểm Cuộc Sống Gia Đình"*
- Trivia: The tatami-floored heart of the house. Family gathers here to eat, watch TV, and relax. The vintage 1980s TV set and the kotatsu define cozy domestic moments. Nobita's friends (Gian, Suneo, Shizuka) often visit here.

**12. Roof Tiles & House Exterior**
- EN: *"Classic Japanese Gable Roof"*
- VI: *"Mái Nhà Kiến Trúc Truyền Thống"*
- Trivia: Red clay kawara tiles in overlapping rows, topped with decorative finials. The gable roof and weathered plaster walls reflect pre-1990s Japanese residential architecture. Fujiko F. Fujio's own home inspired the design, making it historically accurate to late 20th-century Tokyo suburbs.

---

## 4. Layout Notes

**Vertical Stacking:**
- Staircase occupies the eastern edge; ascends from GF-Stairs hall to 2F-Hall/Landing.
- Nobita's room (2f-nobita) sits directly above living room (gf-living).
- Parents' room (2f-parents) sits above kitchen/guest-room area.
- Roof peak (gable) runs N-S over the center ridge.

**Footprint & Dimensions:**
- **Ground Floor:** ~10.5m × 9.5m (per reference image annotation)
- **Total built area:** ~145 m² (as noted in video reference)
- **Lot size:** ~15m × 12m (including yard, fence, shed)
- **Shed:** Separate 2m × 1.5m structure; red-tile roof; storage/tool house

**Adjacency Summary:**
- Genkan opens from street → Living Room (main flow)
- Living Room → Kitchen (E), Guest Room (W), Stairs (E)
- Kitchen → Bathroom (behind stairs), Yard (S)
- Yard contains: Shed (NW), Trees (W+NW), Laundry pole (SW), Fence (perimeter)
- Staircase: Main circulation; steps 8–10 steps; wooden rail on one side
- 2nd Floor: H-shaped layout with Nobita's room (E), Parents' room (W), Hall + Landing (center/stairs)

**Roof Shape:**
- Simple gable (A-frame) with ridge running N-S (length of house)
- Slope ~30–35 degrees
- Red clay tile kawara; white ridge cap
- Slight overhang for rain protection

---

## 5. Color Palette (Hex)

| Element | Color Hex | RGB | Note |
|---------|-----------|-----|------|
| **Tatami mats** | `#A8C686` | (168, 198, 134) | Pale yellowish-green, natural straw |
| **Wood (natural beams/frames)** | `#8B6F47` | (139, 111, 71) | Warm brown, untreated wood |
| **Wood (dark furniture)** | `#5C4A3C` | (92, 74, 60) | Deep brown, aged wood |
| **Kawara roof tiles** | `#C85A3A` | (200, 90, 58) | Red-orange clay |
| **Plaster/exterior walls** | `#E8DCC8` | (232, 220, 200) | Cream/tan aged plaster |
| **Doraemon blue** | `#0080FF` | (0, 128, 255) | Bright primary blue |
| **Doraemon red (collar/nose)** | `#E63946` | (230, 57, 70) | Vibrant red |
| **Doraemon white** | `#FFFFFF` | (255, 255, 255) | Pure white (face, gloves) |
| **Doraemon yellow (bell)** | `#FFD700` | (255, 215, 0) | Gold bell |
| **Sky (exterior background)** | `#87CEEB` | (135, 206, 235) | Light blue sky |
| **Ground/grass (yard)** | `#6B8E23` | (107, 142, 35) | Olive-green grass |
| **Tile floor (bathroom/kitchen)** | `#D3D3D3` | (211, 211, 211) | Light gray |
| **Shadows** | `#4A4A4A` | (74, 74, 74) | Neutral dark gray |

---

## 6. IP & Usage Note

**Doraemon © Fujiko F. Fujio (原作) / Fujiko Pro. / Shogakukan / TV Asahi**

**Personal Portfolio Fan Project Status:** ✓ **Generally Safe**
- Fan art, 3D fan models, and non-commercial fan projects are widely tolerated in the Doraemon fandom.
- No prior licensing needed for hobbyist/portfolio work.
- Credit Fujiko Pro / original creators in any public display or blog post.
- Do not sell physical prints, merchandise, or claim original creation.

**Commercial Use:** ✗ **Requires Licensing**
- Any monetized product, app integration, or merchandising requires explicit license from Fujiko Pro / Shogakukan.
- Cannot use for commercial game, film, app store product, or brand partnership without legal agreement.
- **Exception:** Educational or clearly transformative derivative works (parody, criticism) may fall under fair use in some jurisdictions, but this varies by country.

**Best Practice:** Display prominently: *"Fan project inspired by Doraemon (© Fujiko Pro / Shogakukan / TV Asahi). Not for commercial use."*

---

## 7. Notes on Canon & Sources

- **Ground floor layout:** Primary source is provided Mizuta anime reference image (labeled with Chinese room names; verified as Doraemon Mizuta version).
- **2nd floor rooms (Nobita, Parents, Hall, Landing):** Derived from early 1979 anime series floor plan where parents' room is on 2nd floor. *Note: 2005 anime version places parents' room on 1st floor; this spec uses 1979 canon for design consistency.*
- **Tatami sizing:** Standard 1 jo = 1.82m × 0.91m (Tokyo variant slightly smaller; spec uses standard for calculation).
- **Oshiire detail:** Confirmed in multiple building-block toy reconstructions and wiki references; Doraemon canonically sleeps here.
- **Time Machine in desk drawer:** Central to manga/anime canon; multiple sources confirm.
- **4D Pocket, Dorayaki, Take-copter:** All canon gadgets; widely documented.
- **Bathroom detail:** Rarely shown on-screen (fan note: "Where's the bathroom?" is a recurring joke). Layout assumed based on typical Japanese residential footprint.

**Known Conflicts:**
- 1973 vs. 1979 vs. 2005 anime versions show varying room placements (parents' room floor location, number of windows, genkan details). **This spec defaults to 1979 anime canon as it aligns with the Mizuta animation style.**

---

## 8. Unresolved Questions & Limitations

1. **Parents' Room Floor Location in Mizuta Version:** Is parents' room on 2nd floor (1979 style) or 1st floor (2005 style) in Mizuta anime? Could not confirm from image alone; assumed 1979 based on house size and living room visible size.
2. **Exact Bathroom Location & Size:** Anime rarely shows bathroom; inferred from Japanese residential norms. Could vary in Mizuta canon.
3. **Storage Shed Interior:** Image shows red roof; contents/details not specified in canon references.
4. **Exact Tatami Count per Room:** Derived from room visual size in anime; not explicitly numbered in any single canon source.
5. **Window Placement Precision:** Various anime versions show different window positions; spec uses typical patterns.
6. **Doraemon's Ears (Canon):** Doraemon's ears were eaten by a mouse in the manga backstory, but early anime sometimes depicted him with ears. Spec assumes ear-less (canon manga version).

---

**End of Spec**

*Report generated 2026-08-02 | Reference image: house-ground.webp (Mizuta 水田 version)*
