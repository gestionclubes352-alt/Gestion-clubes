import React from 'react';
import partidos from '../data/partidos.json';
import { firestore } from '../shared/services/firebase';
import { collection, setDoc, doc } from 'firebase/firestore';

const clubId = 'cd-derio'; // ID exacto de tu club en Firestore

const ImportarPartidosClub = () => {
  const importar = async () => {
    const col = collection(firestore, `clubs/${clubId}/partidos`);
    for (const partido of partidos) {
      await setDoc(doc(col, partido.id), partido);
    }
    alert('¡Partidos importados correctamente en clubs/' + clubId + '/partidos!');
  };

  return (
    <div style={{ padding: 40 }}>
      <button
        onClick={importar}
        style={{
          background: '#e11d48', color: 'white', fontWeight: 'bold', fontSize: 18, padding: '16px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px #e11d4822'
        }}
      >
        Importar partidos a Firestore (por club)
      </button>
    </div>
  );
};

export default ImportarPartidosClub;
