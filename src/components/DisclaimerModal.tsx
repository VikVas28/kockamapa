import { useState } from "react";

const STORAGE_KEY = "gl-disclaimer-accepted";

export const DATA_DATE = "12 јуни 2026";

export default function DisclaimerModal() {
  const [accepted, setAccepted] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1",
  );

  if (accepted) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setAccepted(true);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <h2
          id="disclaimer-title"
          className="text-lg font-bold text-slate-900"
        >
          Важно известување
        </h2>

        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
          <p>
            <strong>КоцкаМапа</strong> е{" "}
            <strong>информативна алатка изработена од граѓани</strong> - не е
            официјален документ и не е поврзана со ниту една државна
            институција.
          </p>
          <p>
            Статусите на објектите („мора да се релоцира“, „со ограничување“,
            „сообразен“) се <strong>автоматска пресметка</strong> на
            растојанието до најблиското училиште според правилото од 500
            метри во Законот за игри на среќа (2026). Тие{" "}
            <strong>не претставуваат правна квалификација</strong> - за
            конкретен објект меродавни се единствено регистрите и решенијата
            на Министерството за финансии и Управата за јавни приходи (УЈП).
          </p>
          <p>
            Локациите се преземени од јавни извори (OpenStreetMap и
            објавените лиценци на Министерството за финансии) и{" "}
            <strong>не се теренски проверени</strong> - затоа секаде стои
            ознака „непроверена локација“. Возможни се грешки во положбата,
            имињата и актуелноста на објектите.
          </p>
          <p className="text-xs text-slate-500">
            Извори: © OpenStreetMap contributors (ODbL) · Министерство за
            финансии - регистар на лиценци (архива) · геокодирање: Nominatim.
            Податоците се извлечени на {DATA_DATE}. Деталите се во панелот
            „За законот“.
          </p>
        </div>

        <button
          type="button"
          onClick={accept}
          autoFocus
          className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Разбирам - продолжи кон мапата
        </button>
      </div>
    </div>
  );
}
