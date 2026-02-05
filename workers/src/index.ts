const DAILY_CRYSTALS = [1, 2, 3, 4, 5, 6, 7] as const;
const OFFLINE_CAP_HOURS = 8;

const BASE_PRODUCTION = {
  energy: 140,
  metal: 90,
  water: 70,
  food: 60,
};

const textEncoder = new TextEncoder();

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

type GameState = {
  profile: {
    level: number;
    xp: number;
    title: string;
  };
  resources: {
    energy: number;
    metal: number;
    water: number;
    food: number;
    crystals: number;
  };
  buildings: Record<string, number>;
  army: Record<string, number>;
  research: Record<string, number>;
  clan: {
    id: number | null;
    role: string | null;
  };
};

type PlayerRow = {
  tg_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  created_at: string;
  last_login: string;
  last_tick: string;
  state_json: string;
  daily_claim_date: string | null;
  daily_streak: number;
};

type Env = {
  DB: D1Database;
  BOT_TOKEN: string;
  ALLOWED_ORIGIN?: string;
};

const clampDay = (value: number) => Math.min(7, Math.max(1, value));

const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const levelMultiplier = (level: number) => 1 + Math.max(0, level - 1) * 0.25;

const createDefaultState = (user: TelegramUser): GameState => ({
  profile: {
    level: 1,
    xp: 0,
    title: 'Начальник станции',
  },
  resources: {
    energy: 5000,
    metal: 2000,
    water: 1000,
    food: 500,
    crystals: 100,
  },
  buildings: {
    command_center: 1,
    generator: 1,
    mine: 1,
    well: 1,
    farm: 1,
  },
  army: {
    militia: 10,
  },
  research: {},
  clan: {
    id: null,
    role: null,
  },
});

const normalizeState = (state: GameState | null, user: TelegramUser): GameState => {
  const base = createDefaultState(user);
  if (!state) return base;

  return {
    ...base,
    ...state,
    profile: { ...base.profile, ...state.profile },
    resources: { ...base.resources, ...state.resources },
    buildings: { ...base.buildings, ...state.buildings },
    army: { ...base.army, ...state.army },
    research: { ...base.research, ...state.research },
    clan: { ...base.clan, ...state.clan },
  };
};

const mergeState = (current: GameState, patch: Partial<GameState>, user: TelegramUser) => {
  return normalizeState(
    {
      ...current,
      ...patch,
      profile: { ...current.profile, ...patch.profile },
      resources: { ...current.resources, ...patch.resources },
      buildings: { ...current.buildings, ...patch.buildings },
      army: { ...current.army, ...patch.army },
      research: { ...current.research, ...patch.research },
      clan: { ...current.clan, ...patch.clan },
    } as GameState,
    user,
  );
};

const computeProduction = (buildings: Record<string, number>) => {
  const generator = buildings.generator ?? 1;
  const mine = buildings.mine ?? 1;
  const well = buildings.well ?? 1;
  const farm = buildings.farm ?? 1;

  return {
    energy: BASE_PRODUCTION.energy * levelMultiplier(generator),
    metal: BASE_PRODUCTION.metal * levelMultiplier(mine),
    water: BASE_PRODUCTION.water * levelMultiplier(well),
    food: BASE_PRODUCTION.food * levelMultiplier(farm),
  };
};

const applyOfflineIncome = (state: GameState, lastTickIso: string, now: Date) => {
  const lastTick = Number.isFinite(Date.parse(lastTickIso))
    ? Date.parse(lastTickIso)
    : now.getTime();
  const elapsedMs = Math.max(0, now.getTime() - lastTick);
  const hours = Math.min(elapsedMs / 3_600_000, OFFLINE_CAP_HOURS);
  if (hours <= 0.01) {
    return { state, lastTick: lastTickIso, gains: null };
  }

  const production = computeProduction(state.buildings);
  const gains = {
    energy: Math.floor(production.energy * hours),
    metal: Math.floor(production.metal * hours),
    water: Math.floor(production.water * hours),
    food: Math.floor(production.food * hours),
  };

  state.resources.energy += gains.energy;
  state.resources.metal += gains.metal;
  state.resources.water += gains.water;
  state.resources.food += gains.food;

  return { state, lastTick: now.toISOString(), gains };
};

const corsHeaders = (env: Env, request: Request) => {
  const allowedOrigin = env.ALLOWED_ORIGIN || '*';
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = allowedOrigin === '*' ? '*' : allowedOrigin === origin ? origin : allowedOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

const jsonResponse = (data: unknown, request: Request, env: Env, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env, request),
    },
  });

const parseInitData = (initData: string) =>
  Object.fromEntries(new URLSearchParams(initData)) as Record<string, string>;

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const hmacSha256 = async (key: ArrayBuffer | string, message: string) => {
  const rawKey = typeof key === 'string' ? textEncoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(message));
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const verifyInitData = async (initData: string, botToken: string) => {
  const params = parseInitData(initData);
  const hash = params.hash;
  if (!hash) return false;

  const dataCheckString = Object.keys(params)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('\n');

  const secretKey = await hmacSha256('WebAppData', botToken);
  const calculated = toHex(await hmacSha256(secretKey, dataCheckString));
  return timingSafeEqual(calculated, hash);
};

const getAuth = async (request: Request, env: Env) => {
  const authHeader = request.headers.get('Authorization') || '';
  const initData = authHeader.startsWith('tma ')
    ? authHeader.replace('tma ', '')
    : '';

  if (!initData) {
    return { ok: false, error: 'missing_init_data' };
  }

  const valid = await verifyInitData(initData, env.BOT_TOKEN);
  if (!valid) {
    return { ok: false, error: 'invalid_init_data' };
  }

  const params = parseInitData(initData);
  const user = params.user ? (JSON.parse(params.user) as TelegramUser) : null;

  if (!user?.id) {
    return { ok: false, error: 'invalid_user' };
  }

  return { ok: true, user, params };
};

const getOrCreatePlayer = async (env: Env, user: TelegramUser) => {
  const now = new Date().toISOString();
  const row = (await env.DB.prepare(
    'SELECT * FROM players WHERE tg_id = ? LIMIT 1',
  )
    .bind(user.id)
    .first()) as PlayerRow | null;

  if (!row) {
    const state = createDefaultState(user);
    await env.DB.prepare(
      `INSERT INTO players
        (tg_id, username, first_name, last_name, photo_url, created_at, last_login, last_tick, state_json, daily_claim_date, daily_streak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        user.id,
        user.username ?? null,
        user.first_name ?? null,
        user.last_name ?? null,
        user.photo_url ?? null,
        now,
        now,
        now,
        JSON.stringify(state),
        null,
        0,
      )
      .run();

    return {
      state,
      dailyClaimDate: null,
      dailyStreak: 0,
      lastTick: now,
    };
  }

  let parsedState: GameState | null = null;
  try {
    parsedState = JSON.parse(row.state_json) as GameState;
  } catch {
    parsedState = null;
  }

  const state = normalizeState(parsedState, user);
  return {
    state,
    dailyClaimDate: row.daily_claim_date,
    dailyStreak: row.daily_streak || 0,
    lastTick: row.last_tick || now,
  };
};

const computeDailyInfo = (dailyClaimDate: string | null, dailyStreak: number) => {
  const today = dateKey();
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  const claimedToday = dailyClaimDate === today;
  const available = !claimedToday;
  const nextDay =
    dailyClaimDate === yesterday
      ? clampDay(dailyStreak + 1)
      : claimedToday
      ? clampDay(dailyStreak)
      : 1;
  const rewardCrystals = DAILY_CRYSTALS[nextDay - 1] ?? 1;

  return {
    available,
    streak: dailyStreak,
    todayDay: nextDay,
    rewardCrystals,
  };
};

const updatePlayerState = async (
  env: Env,
  user: TelegramUser,
  state: GameState,
  lastTick: string,
  dailyClaimDate: string | null,
  dailyStreak: number,
) => {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE players
     SET username = ?, first_name = ?, last_name = ?, photo_url = ?,
         last_login = ?, last_tick = ?, state_json = ?, daily_claim_date = ?, daily_streak = ?
     WHERE tg_id = ?`,
  )
    .bind(
      user.username ?? null,
      user.first_name ?? null,
      user.last_name ?? null,
      user.photo_url ?? null,
      now,
      lastTick,
      JSON.stringify(state),
      dailyClaimDate,
      dailyStreak,
      user.id,
    )
    .run();
};

const handleState = async (request: Request, env: Env) => {
  const auth = await getAuth(request, env);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, request, env, 401);
  }

  const { user } = auth;
  const player = await getOrCreatePlayer(env, user);
  const now = new Date();
  const offline = applyOfflineIncome(player.state, player.lastTick, now);
  const daily = computeDailyInfo(player.dailyClaimDate, player.dailyStreak);

  await updatePlayerState(
    env,
    user,
    offline.state,
    offline.lastTick,
    player.dailyClaimDate,
    player.dailyStreak,
  );

  return jsonResponse(
    {
      user: {
        tgId: user.id,
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
      },
      resources: offline.state.resources,
      daily,
    },
    request,
    env,
  );
};

const handleDailyClaim = async (request: Request, env: Env) => {
  const auth = await getAuth(request, env);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, request, env, 401);
  }

  const { user } = auth;
  const player = await getOrCreatePlayer(env, user);
  const today = dateKey();
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));

  if (player.dailyClaimDate === today) {
    const daily = computeDailyInfo(player.dailyClaimDate, player.dailyStreak);
    return jsonResponse(
      { error: 'already_claimed', resources: player.state.resources, daily },
      request,
      env,
      409,
    );
  }

  const newStreak =
    player.dailyClaimDate === yesterday ? clampDay(player.dailyStreak + 1) : 1;
  const reward = DAILY_CRYSTALS[newStreak - 1] ?? 1;

  player.state.resources.crystals += reward;

  await updatePlayerState(
    env,
    user,
    player.state,
    new Date().toISOString(),
    today,
    newStreak,
  );

  const daily = computeDailyInfo(today, newStreak);

  return jsonResponse(
    { resources: player.state.resources, daily },
    request,
    env,
  );
};

const handleSave = async (request: Request, env: Env) => {
  const auth = await getAuth(request, env);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, request, env, 401);
  }

  let payload: { state?: Partial<GameState> } | null = null;
  try {
    payload = (await request.json()) as { state?: Partial<GameState> };
  } catch {
    payload = null;
  }

  if (!payload?.state) {
    return jsonResponse({ error: 'invalid_payload' }, request, env, 400);
  }

  const { user } = auth;
  const player = await getOrCreatePlayer(env, user);
  const merged = mergeState(player.state, payload.state, user);
  const nowIso = new Date().toISOString();

  await updatePlayerState(
    env,
    user,
    merged,
    nowIso,
    player.dailyClaimDate,
    player.dailyStreak,
  );

  return jsonResponse({ state: merged }, request, env);
};

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    const url = new URL(request.url);
    if (url.pathname === '/state' && request.method === 'GET') {
      return handleState(request, env);
    }

    if (url.pathname === '/daily/claim' && request.method === 'POST') {
      return handleDailyClaim(request, env);
    }

    if (url.pathname === '/save' && request.method === 'POST') {
      return handleSave(request, env);
    }

    return jsonResponse({ error: 'not_found' }, request, env, 404);
  },
};
