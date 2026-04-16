import { THEME_STORAGE_KEY } from "@/lib/storage-keys";

export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var theme=t==="light"?"light":"dark";document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

