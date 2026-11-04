// Écran 02 : rejoindre une partie avec son code
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import Bouton from '@/components/Bouton';
import Champ from '@/components/Champ';
import Ecran from '@/components/Ecran';
import { Texte, Titre } from '@/components/Texte';
import { rejoindrePartie } from '@/lib/parties';
import { lirePseudo, memoriserPseudo } from '@/lib/session';
import { couleurs } from '@/theme';

export default function Rejoindre() {
  const params = useLocalSearchParams();
  const [code, setCode] = useState(String(params.code || '').toUpperCase());
  const [pseudo, setPseudo] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    lirePseudo().then((p) => p && setPseudo(p));
  }, []);

  async function valider() {
    setErreur(null);
    setChargement(true);
    try {
      await memoriserPseudo(pseudo);
      const codeValide = await rejoindrePartie(code.trim(), pseudo.trim());
      router.replace(`/salon/${codeValide}`);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <Ecran>
      <Titre>Rejoindre une partie</Titre>
      <Champ
        libelle="Code de la partie"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        maxLength={4}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Champ libelle="Ton pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Matou_87" maxLength={20} autoCorrect={false} />
      {erreur && <Texte couleur={couleurs.corail}>{erreur}</Texte>}
      <Bouton
        titre="Rejoindre"
        onPress={valider}
        chargement={chargement}
        desactive={code.trim().length !== 4 || pseudo.trim().length < 2}
      />
      <Bouton titre="Retour" variante="contour" onPress={() => router.back()} />
    </Ecran>
  );
}
