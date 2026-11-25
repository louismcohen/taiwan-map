import type { PlaceOverride } from './placeKinds';

/**
 * Hand-made corrections to the synced list, keyed by place id (see places.ts). The app applies them
 * on top of the synced data, so edits show up without re-running `pnpm places`.
 */
export const PLACE_OVERRIDES: Record<string, PlaceOverride> = {
  '10164448225396696898': { category: 'nature', onRoute: true }, // Takeshi Kaneshiro Tree
  '2265629457417390757': { category: 'nature' }, // Xiaoyoukeng Recreation Area
  '16864929049465454057': { category: 'food', kind: 'tea' }, // Mountain Ali Tea No.35
  '1107922916253638798': { category: 'nature' }, // Old Donghe Bridge
  '613474156903052813': { kind: null }, // East Coast Fugang Geopark (Little Yehliu)
  '17997645883246315895': { category: 'shopping' }, // TTstyle Arts & Crafts-Wavy Roof Crafts
  '12071263594736592630': { name: 'Old Railway Pedestrian Zone', category: 'shopping' },
  '4756955288636458664': { name: 'Zhonghua Public Market', category: 'food' },
  '17533565803533316296': { category: 'food' }, // Yellow Truck
  '14766748184550707192': { name: 'Yi Xiang Wonton' },
  '17736308362703644369': { name: "Zhou's Steamed Dumplings & Xiao Long Bao", category: 'food' },
  '15980724169663629213': { category: 'fun', kind: 'cable-car' }, // Maokong Gondola
  '11177466618835926370': { category: 'shopping' }, // Syntrend
  '8821343381718162581': { category: 'shopping' }, // Pop Mart Ximending
  '6308952276960001416': { category: 'shopping' }, // Wan Nian Building
  '5968754090926352593': { category: 'shopping' }, // Yongkang St, Da’an District
  '970116378257390920': { category: 'history' }, // Dadaocheng
  '8859018979726397909': { category: 'history' }, // Dihua Street
  '8949821639858373061': { category: 'history' }, // The Red House
  '9532286592307824702': { category: 'nature', kind: 'hiking' }, // Mianyue Line
  '9621131707469152442': { category: 'fun' }, // YUYUPAS Cultural Park
  '18330212538005891221': { category: 'fun' }, // Tropic of Cancer Marker Park
  '7673925169781691228': { category: 'hot-spring' }, // Ruisui
  '845677191071946934': { category: 'fun' }, // Capybara Knight
  '15516791882063487541': { onRoute: true }, // Tamasato Hot Springs
  '2660007106928934526': { name: 'Yuanqi Maohai (dachshund shop)', category: 'shopping' },
  '2667336890240683917': { name: 'Taipei Hotel Bstay', category: 'stay' },
  '16663649875436227512': { category: 'food', kind: 'bakery' }, // L'Atelier Lotus
  '2012842663185658568': { category: 'food', kind: 'dessert' }, // Bai-Shui Tofu Pudding
  '8530353865822784308': { name: 'Chen Ji Intestine & Oyster Vermicelli' },
  '17732148342592702500': { category: 'food', kind: 'bakery' }, // Fuzhou Shizu Pepper Pork Bun
  '13073073649761268807': { name: 'CREMIA Hokkaido Soft Serve', category: 'food', kind: 'dessert' },
  '4601063276038876319': { name: "Curly Mama's Milk Donuts", category: 'food', kind: 'dessert' },
  '15350791680915855665': { category: 'fun' }, // Taipei 101 Observatory
  '13125232806023679015': { category: 'history' }, // Liberty Square Archway
  '4893446054581594546': { category: 'history' }, // Chiang Kai-shek Memorial Hall
  '2844790306267981063': { name: 'Monodon Coffee' },
  '17096692692819822900': { category: 'nature' }, // King Kong Avenue Scenic Road
  '14072310192675825143': { category: 'nature' }, // Sanxiantai Arch Bridge
  '6663235211802839064': { category: 'fun', kind: 'gallery' }, // Dulan Sugar Factory Café and Art Gallery
  '11953694422132767247': { category: 'fun' }, // Tiehua Music Village
  '984381991297383368': { category: 'nature' }, // Brown Boulevard
  '9771305499778020010': { category: 'food', kind: 'noodles' }, // Yuli
  '8470373833461205071': { category: 'nature' }, // Shi Ti Ping
  '11162071363718249391': { category: 'food', kind: 'bakery' }, // Donghe Bun Shop
  '15571833745385473520': { name: 'Manyi Car Rental' },
  '17749572466703936436': { category: 'food' }, // Oretachi No Nikuya
  '6580724558973398465': { name: 'Taroko Gorge', category: 'nature' },
  '7906227708677285152': { name: 'Elephant Mountain', kind: 'hiking' },
  '14336980878260318252': { category: 'hot-spring' }, // Wulai District
  '14309611544913013083': { name: 'Lambai Island (Xiaoliuqiu)', category: 'nature', kind: 'island' },
  '13027470952815082284': { name: 'Dingfeng Scooter Rental' },
  '17850379080818028415': { category: 'fun' }, // Miniatures Museum of Taiwan
  '17068072370431608807': { category: 'fun' }, // Taiping Suspension Bridge Visitor Service Center
  '18444483875628105684': { category: 'nature', kind: 'forest' }, // Alishan National Forest Recreation Area
  '2795744398904309999': { category: 'nature', kind: 'forest' }, // Sun-Link-Sea
};
