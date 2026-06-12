# КоцкаМапа (kockamapa)

Мапа на усогласеност со Законот за игри на среќа (2026).

Веб-апликација што визуелно покажува кои објекти за игри на среќа мора да се
релоцираат, кои остануваат со ограничување, и кои се сообразни — според
правилото за **500 метри (радиус) од основни и средни училишта** од новиот
Закон за игри на среќа (2026). Спецификација: [CLAUDE.md](CLAUDE.md).

## Стартување

```bash
npm install
npm run dev      # развој — http://localhost:5173
npm run build    # продукција (dist/)
npm run preview  # преглед на build-от
```

## Технологии

Vite + React + TypeScript · Tailwind CSS · Leaflet (react-leaflet) ·
Haversine за растојанија. Целосно статична SPA — без бекенд.

## Податоци

- `public/data/schools.json` — училишта (OSM)
- `public/data/venues.json` — објекти за игри на среќа (OSM + регистар на МФ)
- `public/data/zones.geojson` — споени зони од 500 м (генерирано)
- `public/data/municipalities.geojson` — граници на 80-те општини (OSM)
- `public/data/registry-venues.json` — кеш од геокодираните лиценци

Обновување (по редослед):

```bash
node scripts/fetch-municipalities.mjs  # граници на општини (ретко се менува)
node scripts/fetch-osm.mjs             # училишта + објекти од OSM
node scripts/fetch-registry.mjs        # лиценци од Министерство за финансии
node scripts/build-zones.mjs           # споени зони од 500 м
```

Статусот не се чува во JSON — се пресметува во рантајм според најблиското
училиште. Објектите со `verified: false` се означени како „непроверена
локација“ во интерфејсот.

## Дисклејмер

Информативна алатка, не официјален документ. Меродавни се регистрите на
[Министерството за финансии](https://finance.gov.mk/mk-MK/oblasti/licenci-za-igri-na-srekja)
и [УЈП](http://ujp.gov.mk).
