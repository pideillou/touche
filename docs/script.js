// Remplit les liens d'installation à partir de config.js
(function () {
  var reglages = window.TOUCHE || {};

  // Sur GitHub Pages (pseudo.github.io/depot), l'APK est cherché dans la dernière release du dépôt
  function lienApkParDefaut() {
    var hote = window.location.hostname;
    var depot = window.location.pathname.split('/')[1];
    if (!/\.github\.io$/.test(hote) || !depot) return '';
    return 'https://github.com/' + hote.split('.')[0] + '/' + depot + '/releases/latest/download/touche.apk';
  }

  function brancher(idLien, idAbsent, adresse) {
    var lien = document.getElementById(idLien);
    var absent = document.getElementById(idAbsent);
    if (adresse) {
      lien.href = adresse;
      lien.hidden = false;
      absent.hidden = true;
    }
  }

  brancher('lien-apk', 'apk-absent', reglages.lienApk || lienApkParDefaut());
  brancher('lien-expo-go', 'expo-go-absent', reglages.lienExpoGo);

  if (reglages.contact) {
    var zones = document.querySelectorAll('.contact-zone');
    for (var i = 0; i < zones.length; i += 1) {
      zones[i].querySelector('.contact').textContent = reglages.contact;
      zones[i].hidden = false;
    }
  }
})();
