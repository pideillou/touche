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
    if (!lien || !absent) return; // pages sans bouton d'installation
    if (adresse) {
      lien.href = adresse;
      lien.hidden = false;
      absent.hidden = true;
    }
  }

  brancher('lien-apk', 'apk-absent', reglages.lienApk || lienApkParDefaut());

  // L'adresse n'apparaît ni dans le HTML ni en clair dans le code :
  // elle est reconstituée au clic, ce que les robots de spam ne font pas.
  function decoderContact(code) {
    try {
      return window.atob(code).split('').reverse().join('');
    } catch (e) {
      return '';
    }
  }

  if (reglages.contactCode) {
    var zones = document.querySelectorAll('.contact-zone');
    for (var i = 0; i < zones.length; i += 1) {
      (function (zone) {
        var bouton = zone.querySelector('.contact-afficher');
        var lien = zone.querySelector('.contact');
        bouton.addEventListener('click', function () {
          var adresse = decoderContact(reglages.contactCode);
          if (!adresse) return;
          lien.textContent = adresse;
          var sujet = zone.getAttribute('data-sujet') || 'Invitation Touché';
          lien.href = 'mailto:' + adresse + '?subject=' + encodeURIComponent(sujet);
          lien.hidden = false;
          bouton.hidden = true;
          lien.focus();
        });
        zone.hidden = false;
      })(zones[i]);
    }
  }
})();
