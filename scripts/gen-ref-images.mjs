// Generate multi-view 2D reference images with Gemini for manual Hyper3D Rodin image-to-3D.
// Usage: bun scripts/gen-ref-images.mjs --subject doraemon [--model gemini-3-pro-image] [--size 2K] [--views front,left,three-quarter]
//        bun scripts/gen-ref-images.mjs --all
// Output: assets/ref/<subject>/<view>.png. The front view is generated first and then fed back as a
// reference image so the other views stay consistent (same colours, proportions, pose).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GoogleGenAI } from '@google/genai';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = resolve(ROOT, 'assets/ref');

loadDotEnv(resolve(ROOT, '.env'));
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY missing (set it in .env)');
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
// Flash at 1K is roughly an order of magnitude cheaper than the Pro image model at 2K and is
// still plenty for Rodin's image-to-3D input. Override with --model / --size when a subject
// needs more detail.
const MODEL = args.model ?? 'gemini-2.5-flash-image';
// Three views are enough for Rodin multi-view; the back adds cost without adding silhouette info.
const VIEWS = (args.views ?? 'front,left,three-quarter').split(',');
const IMAGE_SIZE = args.size ?? '1K';
const FORCE = Boolean(args.force);

// Shared style prefix keeps all subjects in one visual family.
const STYLE =
  '3D rendered CGI in the style of the "Stand By Me Doraemon" animated movie, smooth soft plastic-like shading, ' +
  'subtle subsurface skin, clean studio lighting, uniform pure white background (#FFFFFF), no floor shadow, no text, no watermark.';

// Plants get their own style: the movie-CGI prefix drags foliage back to photoreal leaf
// clusters, which image-to-3D cannot reconstruct. Clay-render wording keeps volumes solid.
const PLANT_STYLE =
  'Rendered as a smooth matte clay sculpture, soft studio lighting, uniform pure white background (#FFFFFF), ' +
  'simple solid volumes exactly like a stop-motion prop, absolutely no fine leaf detail, no noise, ' +
  'no floor shadow, no text, no watermark.';

// Pose rules are what make the mesh usable for Mixamo auto-rig later.
const CHARACTER_POSE =
  'Full body, whole figure visible with margin, centred, standing straight in a relaxed A-pose: arms held away from the body at about 40 degrees, ' +
  'palms facing inward, fingers slightly apart, feet shoulder-width apart, neutral calm expression, mouth closed, eyes open looking straight ahead. ' +
  'No props, nothing in hands, no accessories that touch the body other than what is described.';

const SUBJECTS = {
  doraemon: {
    kind: 'character',
    name: 'Doraemon',
    description:
      'a round blue robot cat with a white face and white belly, round white hands without fingers, small red nose, whiskers, ' +
      'a red collar with a yellow bell, a white pouch pocket on the belly, short stubby legs, no ears',
  },
  nobita: {
    kind: 'character',
    name: 'Nobita Nobi',
    description:
      'a thin ten-year-old Japanese boy with short black hair, big round glasses, small eyes, wearing a yellow short-sleeve shirt, ' +
      'dark blue shorts, white socks and blue sneakers',
  },
  shizuka: {
    kind: 'character',
    name: 'Shizuka Minamoto',
    description:
      'a ten-year-old Japanese girl with black hair in two low pigtails, gentle smile, wearing a pink long-sleeve blouse, ' +
      'a red pleated skirt, white socks and pink shoes',
  },
  jaian: {
    kind: 'character',
    name: 'Takeshi "Gian" Goda',
    description:
      'a big stocky ten-year-old Japanese boy, wide face, small eyes, thick black hair, wearing an orange long-sleeve shirt with a ' +
      'horizontal yellow stripe across the chest, dark blue trousers and blue sneakers',
  },
  suneo: {
    kind: 'character',
    name: 'Suneo Honekawa',
    description:
      'a short slim ten-year-old Japanese boy with black hair swept into a pointed swoop, narrow eyes, small pointed mouth, ' +
      'wearing a green long-sleeve shirt, brown shorts, white socks and yellow shoes',
  },
  tree: {
    kind: 'plant',
    name: 'a Japanese suburban street tree',
    description:
      'a single small deciduous broadleaf tree about five metres tall, one straight grey-brown trunk that ' +
      'splits into four or five main branches, a rounded dense canopy of bright fresh green leaves, ' +
      'no flowers, no fruit, roots hidden, nothing else in frame',
  },
  hedge: {
    kind: 'plant',
    name: 'a clipped garden shrub',
    description:
      'a single rounded evergreen garden shrub about eighty centimetres tall, dense small dark green leaves, ' +
      'neatly clipped into a soft dome, a few woody stems visible at the base, nothing else in frame',
  },
  sakura: {
    kind: 'plant',
    name: 'a stylized cartoon cherry blossom tree in full bloom, one single object',
    description:
      'a smooth sculpted 3D cartoon sakura tree like a wooden toy: one dark brown trunk leaning ' +
      'slightly with two main branches, and a canopy of exactly four big smooth rounded solid ' +
      'soft-pink blossom blobs merged together, completely solid matte surfaces with no ' +
      'individual petals, no texture noise, no holes, no green leaves, nothing else in frame',
  },
  house: {
    kind: 'building',
    name: "Nobita's house from Doraemon",
    description:
      'a small two-storey suburban Japanese family house: cream stucco walls, blue-grey Japanese kawara tile roof with gentle hip gable, ' +
      'a lower tile awning over the ground floor, a small entrance porch with a wooden front door with a small window, ' +
      'sliding aluminium windows, wooden shutter panels beside the upper window, a rain gutter. ' +
      'Building only, no fence, no trees, no people, no street.',
  },
};

const VIEW_TEXT = {
  front: 'Front orthographic-like view, camera at eye level, facing the viewer directly.',
  left: 'Exact left side profile view (90 degrees), camera at eye level.',
  back: 'Exact back view (180 degrees), camera at eye level.',
  'three-quarter': 'Three-quarter view from the front-left (45 degrees), camera slightly above eye level.',
};

const ai = new GoogleGenAI({ apiKey });

const targets = args.all ? Object.keys(SUBJECTS) : args.subject ? [args.subject] : [];
if (targets.length === 0) {
  console.error(`Pass --subject <id> or --all. Subjects: ${Object.keys(SUBJECTS).join(', ')}`);
  process.exit(1);
}

for (const id of targets) {
  const subject = SUBJECTS[id];
  if (!subject) {
    console.error(`Unknown subject "${id}"`);
    process.exit(1);
  }
  const dir = resolve(OUT_DIR, id);
  mkdirSync(dir, { recursive: true });
  let frontPng = null;

  for (const view of VIEWS) {
    const file = resolve(dir, `${view}.png`);
    if (existsSync(file) && !FORCE) {
      console.log(`skip ${id}/${view} (exists)`);
      if (view === 'front') frontPng = readFileSync(file);
      continue;
    }
    const png = await generateView(subject, view, view === 'front' ? null : frontPng);
    writeFileSync(file, png);
    if (view === 'front') frontPng = png;
    console.log(`wrote ${id}/${view}.png (${(png.length / 1024).toFixed(0)} KB)`);
  }
}

async function generateView(subject, view, referencePng) {
  const named = `${subject.name}, ${subject.description}`;
  const anonymous = subject.description;
  const attempts = [named, anonymous];
  let lastErr;
  for (const who of attempts) {
    const prompt = buildPrompt(subject, who, view, Boolean(referencePng));
    try {
      return await callGemini(prompt, referencePng);
    } catch (err) {
      lastErr = err;
      console.warn(`  retry ${view} with anonymous description: ${err.message}`);
    }
  }
  throw lastErr;
}

function buildPrompt(subject, who, view, hasReference) {
  const pose =
    subject.kind === 'character'
      ? CHARACTER_POSE
      : subject.kind === 'plant'
        ? 'The whole plant visible with margin, centred, upright, perfectly symmetrical lighting so no side is in deep shadow.'
        : 'Whole building visible with margin, centred.';
  const consistency = hasReference
    ? 'Use the attached image as the exact same subject: identical colours, proportions, outfit and pose. Only the camera angle changes. '
    : '';
  const style = subject.kind === 'plant' ? PLANT_STYLE : STYLE;
  return `${consistency}${VIEW_TEXT[view]} Subject: ${who}. ${pose} ${style}`;
}

async function callGemini(prompt, referencePng) {
  const parts = [{ text: prompt }];
  if (referencePng)
    parts.push({ inlineData: { mimeType: 'image/png', data: referencePng.toString('base64') } });
  const config = { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: '1:1' } };
  // Only the Pro/Nano-Banana-Pro image models accept an explicit imageSize.
  if (MODEL.includes('pro-image') || MODEL.includes('banana-pro')) config.imageConfig.imageSize = IMAGE_SIZE;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config,
      });
      const image = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!image) {
        const text = res.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join(' ');
        throw new Error(`no image returned${text ? `: ${text.slice(0, 200)}` : ''}`);
      }
      return Buffer.from(image.inlineData.data, 'base64');
    } catch (err) {
      const status = err?.status ?? err?.code;
      if ((status === 429 || status === 503) && attempt < 4) {
        const wait = 5000 * attempt;
        console.warn(`  ${status}, waiting ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}
