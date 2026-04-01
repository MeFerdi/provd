export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("provd.theme");var theme=t==="light"?"light":"dark";document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

