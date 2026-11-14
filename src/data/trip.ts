export type DayKey = 'wed' | 'thu' | 'fri' | 'sat';

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

export const DAYS: Record<DayKey, Day> = {
  wed: { name: 'Wednesday', color: 'var(--wed)', hex: '#6d5bd0' },
  thu: { name: 'Thursday', color: 'var(--thu)', hex: '#0f8b8d',
    note: 'North along the coast on Hwy 11, then over the mountains on Hwy 23 into the rift valley.' },
  fri: { name: 'Friday', color: 'var(--fri)', hex: '#e07a1f',
    note: 'Yuchang Hwy 30 to the coast, up Hwy 11, then back inland on Hwy 11甲.' },
  sat: { name: 'Saturday', color: 'var(--sat)', hex: '#d1495b',
    note: 'Easy ride north up the rift valley to Hualien.' },
};

export const STOPS: Stop[] = [
  { day: 'wed', stay: true, lat: 22.7669, lng: 121.1424, original: [22.7933, 121.1234], name: 'Taitung Easy Stay Homestay (台東可可)', label: 'Night Stay',
    desc: 'Highly rated modern boutique homestay in Taitung City featuring pristine cleanliness and convenient scooter parking.' },

  { day: 'thu', suggested: true, lat: 22.8106, lng: 121.1947, name: 'Jialulan Coastal Park', query: '加路蘭遊憩區', label: 'Suggested · On the way',
    desc: 'Grassy clifftop park right on Hwy 11 with driftwood art installations and wide Pacific views. A good first stretch-your-legs stop out of Taitung.' },
  { day: 'thu', lat: 22.8775, lng: 121.2262, original: [22.8967, 121.2144], name: 'Dulan Sugar Factory Café and Art Gallery', query: '都蘭糖廠', label: 'Stop',
    desc: 'Historic industrial sugar mill turned vibrant coastal art community. Features local woodwork studios and craft cafes.' },
  { day: 'thu', lat: 22.9664, lng: 121.3045, name: 'Donghe Bun Shop', query: '東河包子', label: 'Snack',
    desc: 'Legendary roadside pitstop famous for fluffy steamed pork buns and sweet brown sugar buns. Grab a couple before heading inland on Hwy 23.' },
  { day: 'thu', lat: 23.1259, lng: 121.2193, original: [23.0519, 121.2183], name: 'Chishang Train Station (Bento Lunch)', query: '池上車站', label: 'Lunch',
    desc: "Traditional boxed rail lunches served in thin wooden boxes to commemorate Taiwan's finest rice." },
  { day: 'thu', lat: 23.0985, lng: 121.2105, original: [23.0531, 121.2217], name: 'Brown Boulevard (Mr. Brown Avenue)', query: '伯朗大道', label: 'Stop',
    desc: 'Massive expanse of rice fields completely free of utility lines. Features the famous Takeshi Kaneshiro Tree.' },
  { day: 'thu', lat: 23.3333, lng: 121.3167, name: '馬蓋先美食玉里麵 (Yuli Noodles)', query: '馬蓋先美食玉里麵', label: 'Dinner',
    desc: 'Famous diner serving traditional oil-tossed Yuli dry noodles topped with aromatic shallot oil. About 10 minutes from the hotel.' },
  { day: 'thu', stay: true, lat: 23.2808, lng: 121.3420, original: [23.2956, 121.3683], name: 'Antong Hot Spring Hotel', query: '安通溫泉飯店', label: 'Night Stay',
    desc: 'Relaxing hot spring hotel nestled in the mountains right off the scenic cross-mountain Yuchang Highway.' },

  { day: 'fri', suggested: true, lat: 23.1225, lng: 121.4120, name: 'Sanxiantai (Eight-Arch Bridge)', query: '三仙台', label: 'Suggested · Short backtrack',
    desc: 'Offshore volcanic islet linked by a wave-shaped eight-arch footbridge — one of the signature sights of the east coast. Adds about 30 km south from where Hwy 30 meets the coast.' },
  { day: 'fri', suggested: true, lat: 23.4006, lng: 121.4878, name: 'Baxian Cave (八仙洞)', query: '八仙洞', label: 'Suggested · On the way',
    desc: 'Sea caves carved into a cliff now lifted well above the waves; one of the oldest prehistoric sites in Taiwan. Right on Hwy 11.' },
  { day: 'fri', suggested: true, lat: 23.4677, lng: 121.4889, original: [23.4655, 121.5106], name: 'Changhong Bridge & Tropic of Cancer Marker', query: '長虹橋', label: 'Suggested · On the way',
    desc: 'Red arch bridge over the mouth of the Xiuguluan River, with the white Tropic of Cancer monument at Jingpu a minute up the road.' },
  { day: 'fri', lat: 23.4877, lng: 121.5108, original: [23.2783, 121.4931], name: 'Shi Ti Ping (Stone Steps)', query: '石梯坪', label: 'Stop',
    desc: 'Spectacular wave-cut volcanic marine terraces. Park and explore the massive stone staircase steps over the Pacific.' },
  { day: 'fri', lat: 23.6558, lng: 121.4239, name: 'Hualien Tourism Sugar Factory (Guangfu)', query: '花蓮觀光糖廠', label: 'Stop',
    desc: 'Retro Japanese colonial-era refinery. A perfect highway rest stop famous for fresh milk ice cream cones.' },

  { day: 'sat', suggested: true, lat: 23.6578, lng: 121.4097, original: [23.6720, 121.4250], name: 'Mataian Wetland (馬太鞍濕地)', query: '馬太鞍濕地', label: 'Suggested · On the way',
    desc: 'Amis farming wetland of fish ponds, lotus and streams next to Guangfu, with local Amis restaurants. Nice slow morning start.' },
  { day: 'sat', suggested: true, lat: 23.9233, lng: 121.5050, name: 'Liyu Lake (鯉魚潭)', query: '鯉魚潭', label: 'Suggested · Small detour',
    desc: "Hualien's largest inland lake, ringed by forested mountains. Flat lakeside loop; a few km off Hwy 9." },
  { day: 'sat', suggested: true, offRoute: true, lat: 24.0300, lng: 121.6260, name: 'Qixingtan Beach (七星潭)', query: '七星潭', label: 'Suggested · Optional detour',
    desc: 'Crescent pebble beach with the Central Mountains dropping to the sea. About 15 km round trip from the station if you have time before returning the scooter.' },
  { day: 'sat', final: true, lat: 23.9936, lng: 121.5997, name: 'Hualien Train Station', query: '花蓮車站', label: 'Final Destination',
    desc: 'Return your 155cc+ scooter directly outside the station before boarding your evening express train back to Taipei.' },
];

export const NIGHTS: Record<DayKey, Town[]> = {
  wed: [
    { name: 'Taitung City', lat: 22.7555, lng: 121.1495, r: 4.5, tag: 'Recommended',
      note: 'Where the planned homestay is. Downtown has Tiehua Music Village and the night market, and it is the easiest place to pick up a scooter.' },
    { name: 'Dulan', lat: 22.8734, lng: 121.2276, r: 3, tag: 'Alternative',
      note: 'Laid-back surf village 30 km up the coast with cafés and live music. Gives you a head start on Thursday.' },
  ],
  thu: [
    { name: 'Antong Hot Springs', lat: 23.2805, lng: 121.3425, r: 3, tag: 'Recommended', query: '安通露天野溪溫泉',
      note: 'Where the planned hot spring hotel is. Quiet and rural, a short ride from Yuli for dinner.' },
    { name: 'Yuli', lat: 23.3341, lng: 121.3147, r: 3, tag: 'Alternative', query: '玉里鎮',
      note: 'Market town with the most food and lodging in this stretch of the valley. Walk to dinner, and Hwy 30 starts right here on Friday.' },
  ],
  fri: [
    { name: 'Guangfu / Mataian', lat: 23.6657, lng: 121.4236, r: 4.5, tag: 'Recommended', query: '光復鄉',
      note: 'Friday ends here, so no extra riding. Amis-run homestays around the wetland, with the sugar factory next door.' },
    { name: 'Fenglin', lat: 23.7468, lng: 121.4509, r: 3.5, tag: 'Alternative', query: 'Fenglin Township',
      note: 'Small Hakka "slow city" 10 km further north on Saturday\'s route, with more B&Bs and good Hakka food.' },
  ],
  sat: [],
};

export const NIGHT_NAMES: Partial<Record<DayKey, string>> = {
  wed: 'Wednesday night',
  thu: 'Thursday night',
  fri: 'Friday night',
};
