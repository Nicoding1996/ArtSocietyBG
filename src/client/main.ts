import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles.css';
import './game.css';

const params = new URLSearchParams(location.search);
const ui = document.getElementById('ui')!;

if (params.has('gallery')) {
  // A wall of sample paintings in every shape, handy for tuning the art generators.
  void import('./artpage').then((m) => m.showArtPage(ui, Number(params.get('gallery')) || 1));
} else {
  void import('./app').then((m) => {
    const app = new m.App(ui);
    // Lets automated tests reach the 3D world (opt-in with ?debug).
    if (params.has('debug')) (window as unknown as { __artSociety: unknown }).__artSociety = app;
  });
}
