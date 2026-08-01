import React from 'react';
import partidos from '../data/partidos.json';
import { firestore } from '../shared/services/firebase';
import { collection, setDoc, doc } from 'firebase/firestore';

const ImportarPartidos = () => {
  const importar = async () => {
    const col = collection(firestore, 'partidos');
    for (const partido of partidos) {
      await setDoc(doc(col, partido.id), partido);
    }
    alert('¡Partidos importados correctamente!');
  };

  return (
    <div style={{ padding: 40 }}>
      <button
        onClick={importar}
        style={{
          background: '#e11d48', color: 'white', fontWeight: 'bold', fontSize: 18, padding: '16px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px #e11d4822'
        }}
      >
        Importar partidos a Firestore
      </button>
    </div>
  );
};

export default ImportarPartidos;
