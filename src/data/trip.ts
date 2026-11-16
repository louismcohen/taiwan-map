export type DayKey = 'wed' | 'thu' | 'fri' | 'sat';

export type PlanVariant = 'A' | 'B' | 'C';

export interface Day {
  name: string;
  /** CSS color used in the sidebar; may reference a custom property. */
  color: string;
  /** Literal color for map layers and markers, which can't resolve CSS variables. */
  hex: string;
  note?: string;
}

export interface Stop {
  day: DayKey;
  lat: number;
  lng: number;
  name: string;
  label: string;
  desc: string;
  /** Google Maps search text; falls back to `name`. */
  query?: string;
  stay?: boolean;
  final?: boolean;
  /** Addition to the original plan. */
  suggested?: boolean;
  /** Detour not included in the route line. */
  offRoute?: boolean;
  /** Supplied coordinates that were several km from the real place. */
  original?: [number, number];
}

export type TownTag = 'Recommended' | 'Alternative';

/** Area to stay for a night, drawn as a soft zone rather than a pin. */
export interface Town {
  name: string;
  lat: number;
  lng: number;
  /** Zone radius in km. */
  r: number;
  tag: TownTag;
  note: string;
  /** Google Places search text for photos; falls back to `name`. */
  query?: string;
}

export interface PlanOption {
  id: PlanVariant;
  short: string;
  name: string;
}

export const DEFAULT_VARIANT: PlanVariant = 'A';

export const PLAN_OPTIONS: PlanOption[] = [
  { id: 'A', short: 'Coast', name: 'Coast day' },
  { id: 'B', short: 'Cut inland', name: 'Cut inland' },
  { id: 'C', short: 'Valley', name: 'Valley day' },
];

export const isPlanVariant = (v: string): v is PlanVariant => v === 'A' || v === 'B' || v === 'C';

const BASE_DAYS: Record<DayKey, Day> = {
  wed: { name: 'Wednesday', color: 'var(--wed)', hex: '#6d5bd0' },
  thu: {
    name: 'Thursday',
    color: 'var(--thu)',
    hex: '#0f8b8d',
    note: 'North along the coast on Hwy 11, then over the mountains on Hwy 23 into the rift valley.',
  },
  fri: { name: 'Friday', color: 'var(--fri)', hex: '#e07a1f' },
  sat: { name: 'Saturday', color: 'var(--sat)', hex: '#d1495b' },
};

const FRI_NOTES: Record<PlanVariant, string> = {
  A: 'Morning detour to Nanan Falls, Yuchang Hwy 30 to the coast, up Hwy 11, then inland on Hwy 11甲 to Guangfu.',
  B: 'Coast on Hwy 11 as far as Changhong Bridge, then inland to the Ruisui Tropic park and overnight in Ruisui.',
  C: 'Valley north on Hwy 9 via Ruisui; coast pins are optional detours, not on the drawn line.',
};

const SAT_NOTES: Record<PlanVariant, string> = {
  A: 'Easy ride north up the rift valley to Hualien.',
  B: 'From Ruisui north past Guangfu and Mataian, then Liyu Lake to Hualien.',
  C: 'Easy ride north up the rift valley to Hualien.',
};

export function daysFor(variant: PlanVariant): Record<DayKey, Day> {
  return {
    ...BASE_DAYS,
    fri: { ...BASE_DAYS.fri, note: FRI_NOTES[variant] },
    sat: { ...BASE_DAYS.sat, note: SAT_NOTES[variant] },
  };
}

/** Static day colors/names for map chrome that does not need per-variant notes. */
export const DAYS = daysFor(DEFAULT_VARIANT);

const wedStay: Stop = {
  day: 'wed',
  stay: true,
  lat: 22.7669,
  lng: 121.1424,
  original: [22.7933, 121.1234],
  name: 'Taitung Easy Stay Homestay (台東可可)',
  label: 'Night Stay',
  desc: 'Highly rated modern boutique homestay in Taitung City featuring pristine cleanliness and convenient scooter parking.',
};

const thuStops: Stop[] = [
  {
    day: 'thu',
    suggested: true,
    lat: 22.8106,
    lng: 121.1947,
    name: 'Jialulan Coastal Park',
    query: '加路蘭遊憩區',
    label: 'Suggested · On the way',
    desc: 'Grassy clifftop park right on Hwy 11 with driftwood art installations and wide Pacific views. A good first stretch-your-legs stop out of Taitung.',
  },
  {
    day: 'thu',
    lat: 22.8775,
    lng: 121.2262,
    original: [22.8967, 121.2144],
    name: 'Dulan Sugar Factory Café and Art Gallery',
    query: '都蘭糖廠',
    label: 'Stop',
    desc: 'Historic industrial sugar mill turned vibrant coastal art community. Features local woodwork studios and craft cafes.',
  },
  {
    day: 'thu',
    lat: 22.9664,
    lng: 121.3045,
    name: 'Donghe Bun Shop',
    query: '東河包子',
    label: 'Snack',
    desc: 'Legendary roadside pitstop famous for fluffy steamed pork buns and sweet brown sugar buns. Grab a couple before heading inland on Hwy 23.',
  },
  {
    day: 'thu',
    lat: 23.1259,
    lng: 121.2193,
    original: [23.0519, 121.2183],
    name: 'Chishang Train Station (Bento Lunch)',
    query: '池上車站',
    label: 'Lunch',
    desc: "Traditional boxed rail lunches served in thin wooden boxes to commemorate Taiwan's finest rice.",
  },
  {
    day: 'thu',
    lat: 23.0985,
    lng: 121.2105,
    original: [23.0531, 121.2217],
    name: 'Brown Boulevard (Mr. Brown Avenue)',
    query: '伯朗大道',
    label: 'Stop',
    desc: 'Massive expanse of rice fields completely free of utility lines. Features the famous Takeshi Kaneshiro Tree.',
  },
  {
    day: 'thu',
    lat: 23.3333,
    lng: 121.3167,
    name: '馬蓋先美食玉里麵 (Yuli Noodles)',
    query: '馬蓋先美食玉里麵',
    label: 'Dinner',
    desc: 'Famous diner serving traditional oil-tossed Yuli dry noodles topped with aromatic shallot oil. About 10 minutes from the hotel.',
  },
  {
    day: 'thu',
    stay: true,
    lat: 23.2808,
    lng: 121.3420,
    original: [23.2956, 121.3683],
    name: 'Antong Hot Spring Hotel',
    query: '安通溫泉飯店',
    label: 'Night Stay',
    desc: 'Relaxing hot spring hotel nestled in the mountains right off the scenic cross-mountain Yuchang Highway.',
  },
];

const nananFalls: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.3117,
  lng: 121.2478,
  name: 'Nanan Falls (南安瀑布)',
  query: '南安瀑布',
  label: 'Suggested · Morning detour',
  desc: 'Fifty-metre waterfall on Hwy 30 west of Yuli, about 10 km from town. Short boardwalk to the viewing platform before you cross the mountains to the coast.',
};

const sanxiantai: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.1225,
  lng: 121.4120,
  name: 'Sanxiantai (Eight-Arch Bridge)',
  query: '三仙台',
  label: 'Suggested · Short backtrack',
  desc: 'Offshore volcanic islet linked by a wave-shaped eight-arch footbridge — one of the signature sights of the east coast. Adds about 30 km south from where Hwy 30 meets the coast.',
};

const kingKong: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.3306,
  lng: 121.4514,
  name: 'King Kong Avenue Scenic Road (金剛大道)',
  query: '金剛大道',
  label: 'Suggested · On the way',
  desc: 'Straight coastal stretch of Hwy 11 through Changbin with big Pacific views. A natural photo stop between Sanxiantai and Baxian Cave.',
};

const baxian: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.4006,
  lng: 121.4878,
  name: 'Baxian Cave (八仙洞)',
  query: '八仙洞',
  label: 'Suggested · On the way',
  desc: 'Sea caves carved into a cliff now lifted well above the waves; one of the oldest prehistoric sites in Taiwan. Right on Hwy 11.',
};

const changhong: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.4677,
  lng: 121.4889,
  original: [23.4655, 121.5106],
  name: 'Changhong Bridge & Tropic of Cancer Marker',
  query: '長虹橋',
  label: 'Suggested · On the way',
  desc: 'Red arch bridge over the mouth of the Xiuguluan River, with the white Tropic of Cancer monument at Jingpu a minute up the road.',
};

const shiTiPing: Stop = {
  day: 'fri',
  lat: 23.4877,
  lng: 121.5108,
  original: [23.2783, 121.4931],
  name: 'Shi Ti Ping (Stone Steps)',
  query: '石梯坪',
  label: 'Stop',
  desc: 'Spectacular wave-cut volcanic marine terraces. Park and explore the massive stone staircase steps over the Pacific.',
};

const sugarFactory: Stop = {
  day: 'fri',
  lat: 23.6558,
  lng: 121.4239,
  name: 'Hualien Tourism Sugar Factory (Guangfu)',
  query: '花蓮觀光糖廠',
  label: 'Stop',
  desc: 'Retro Japanese colonial-era refinery. A perfect highway rest stop famous for fresh milk ice cream cones.',
};

const ruisuiTropic: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.4657,
  lng: 121.3574,
  name: 'Tropic of Cancer Marker Park (Ruisui)',
  query: '北回歸線標誌公園 瑞穗',
  label: 'Suggested · Wuhe plateau',
  desc: 'White sundial-style Tropic of Cancer monument on the Wuhe tea plateau — different from the Jingpu coastal marker by Changhong Bridge.',
};

const ruisuiStop: Stop = {
  day: 'fri',
  suggested: true,
  lat: 23.4975,
  lng: 121.3782,
  name: 'Ruisui',
  query: '瑞穗',
  label: 'Suggested · Hot spring town',
  desc: 'Hot spring village with private tubs in many hotels, plus cafés that serve coffee grown around Ruisui.',
};

const mataian: Stop = {
  day: 'sat',
  suggested: true,
  lat: 23.6578,
  lng: 121.4097,
  original: [23.6720, 121.4250],
  name: 'Mataian Wetland (馬太鞍濕地)',
  query: '馬太鞍濕地',
  label: 'Suggested · On the way',
  desc: 'Amis farming wetland of fish ponds, lotus and streams next to Guangfu, with local Amis restaurants. Nice slow morning start.',
};

const liyu: Stop = {
  day: 'sat',
  suggested: true,
  lat: 23.9233,
  lng: 121.5050,
  name: 'Liyu Lake (鯉魚潭)',
  query: '鯉魚潭',
  label: 'Suggested · Small detour',
  desc: "Hualien's largest inland lake, ringed by forested mountains. Flat lakeside loop; a few km off Hwy 9.",
};

const qixingtan: Stop = {
  day: 'sat',
  suggested: true,
  offRoute: true,
  lat: 24.0300,
  lng: 121.6260,
  name: 'Qixingtan Beach (七星潭)',
  query: '七星潭',
  label: 'Suggested · Optional detour',
  desc: 'Crescent pebble beach with the Central Mountains dropping to the sea. About 15 km round trip from the station if you have time before returning the scooter.',
};

const hualienStation: Stop = {
  day: 'sat',
  final: true,
  lat: 23.9936,
  lng: 121.5997,
  name: 'Hualien Train Station',
  query: '花蓮車站',
  label: 'Final Destination',
  desc: 'Return your 155cc+ scooter directly outside the station before boarding your evening express train back to Taipei.',
};

const coastOnRoute: Stop[] = [sanxiantai, kingKong, baxian, changhong, shiTiPing];

const coastOffRoute: Stop[] = coastOnRoute.map((s) => ({
  ...s,
  offRoute: true,
  label: 'Suggested · Coast alternative',
  desc: `${s.desc} Off the drawn valley route — optional if you want a coast detour.`,
}));

function satTail(variant: PlanVariant): Stop[] {
  if (variant === 'B') {
    return [
      { ...sugarFactory, day: 'sat', label: 'Stop', suggested: true },
      mataian,
      {
        ...shiTiPing,
        day: 'sat',
        suggested: true,
        offRoute: true,
        label: 'Suggested · Optional coast',
        desc: `${shiTiPing.desc} Optional if you still want it after sleeping in Ruisui — a detour back to the coast.`,
      },
      liyu,
      qixingtan,
      hualienStation,
    ];
  }
  return [mataian, liyu, qixingtan, hualienStation];
}

export function stopsFor(variant: PlanVariant): Stop[] {
  const head = [wedStay, ...thuStops, nananFalls];
  if (variant === 'A') return [...head, ...coastOnRoute, sugarFactory, ...satTail('A')];
  if (variant === 'B') return [...head, sanxiantai, kingKong, baxian, changhong, ruisuiTropic, ...satTail('B')];
  return [...head, ruisuiTropic, ruisuiStop, sugarFactory, ...coastOffRoute, ...satTail('C')];
}

const wedNights: Town[] = [
  {
    name: 'Taitung City',
    lat: 22.7555,
    lng: 121.1495,
    r: 4.5,
    tag: 'Recommended',
    note: 'Where the planned homestay is. Downtown has Tiehua Music Village and the night market, and it is the easiest place to pick up a scooter.',
  },
  {
    name: 'Dulan',
    lat: 22.8734,
    lng: 121.2276,
    r: 3,
    tag: 'Alternative',
    note: 'Laid-back surf village 30 km up the coast with cafés and live music. Gives you a head start on Thursday.',
  },
];

const thuNights: Town[] = [
  {
    name: 'Antong Hot Springs',
    lat: 23.2805,
    lng: 121.3425,
    r: 3,
    tag: 'Recommended',
    query: '安通露天野溪溫泉',
    note: 'Where the planned hot spring hotel is. Quiet and rural, a short ride from Yuli for dinner.',
  },
  {
    name: 'Yuli',
    lat: 23.3341,
    lng: 121.3147,
    r: 3,
    tag: 'Alternative',
    query: '玉里鎮',
    note: 'Market town with the most food and lodging in this stretch of the valley. Walk to dinner, and Hwy 30 starts right here on Friday.',
  },
];

const guangfuTown = (tag: TownTag, note: string): Town => ({
  name: 'Guangfu / Mataian',
  lat: 23.6657,
  lng: 121.4236,
  r: 4.5,
  tag,
  query: '光復鄉',
  note,
});

const ruisuiTown = (tag: TownTag, note: string): Town => ({
  name: 'Ruisui',
  lat: 23.4975,
  lng: 121.3782,
  r: 3.5,
  tag,
  query: '瑞穗鄉',
  note,
});

const fenglinTown: Town = {
  name: 'Fenglin',
  lat: 23.7468,
  lng: 121.4509,
  r: 3.5,
  tag: 'Alternative',
  query: 'Fenglin Township',
  note: 'Small Hakka "slow city" 10 km further north on Saturday\'s route, with more B&Bs and good Hakka food.',
};

export function nightsFor(variant: PlanVariant): Record<DayKey, Town[]> {
  const fri =
    variant === 'B'
      ? [
          ruisuiTown(
            'Recommended',
            'Hot spring village with private tubs in many rooms, and cafés serving locally grown coffee. The Wuhe Tropic of Cancer park is five minutes south.',
          ),
          guangfuTown(
            'Alternative',
            'Push on another 20 km if you prefer to end at the sugar factory and Mataian wetland.',
          ),
          fenglinTown,
        ]
      : [
          guangfuTown(
            'Recommended',
            variant === 'A'
              ? 'Friday ends here, so no extra riding. Amis-run homestays around the wetland, with the sugar factory next door.'
              : 'Friday ends here on the valley route. Amis-run homestays around the wetland, with the sugar factory next door.',
          ),
          ruisuiTown(
            'Alternative',
            'Hot spring village south of Guangfu on Hwy 9. The Wuhe Tropic of Cancer park is five minutes away if you stay here.',
          ),
          fenglinTown,
        ];

  return { wed: wedNights, thu: thuNights, fri, sat: [] };
}

/** Default (Coast) lists — used by the photos script and as a stable fallback. */
export const STOPS = stopsFor(DEFAULT_VARIANT);
export const NIGHTS = nightsFor(DEFAULT_VARIANT);

/** Every stop/town name across variants, for one-shot photo fetching. */
export function allPhotoPlaces(): { name: string; lat: number; lng: number; query?: string }[] {
  const byName = new Map<string, { name: string; lat: number; lng: number; query?: string }>();
  for (const variant of PLAN_OPTIONS.map((p) => p.id)) {
    for (const s of stopsFor(variant)) {
      byName.set(s.name, { name: s.name, lat: s.lat, lng: s.lng, query: s.query });
    }
    for (const towns of Object.values(nightsFor(variant))) {
      for (const t of towns) {
        byName.set(t.name, { name: t.name, lat: t.lat, lng: t.lng, query: t.query });
      }
    }
  }
  return [...byName.values()];
}

export const NIGHT_NAMES: Partial<Record<DayKey, string>> = {
  wed: 'Wednesday night',
  thu: 'Thursday night',
  fri: 'Friday night',
};
