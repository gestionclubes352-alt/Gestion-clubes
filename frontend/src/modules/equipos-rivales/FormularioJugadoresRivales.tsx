import React, { useState } from 'react';

interface JugadorRival {
  nombre: string;
  dorsal: string;
  posicion: string;
  edad: string;
}

const FormularioJugadoresRivales: React.FC = () => {
  const [jugadores, setJugadores] = useState<JugadorRival[]>([]);
  const [nuevoJugador, setNuevoJugador] = useState<JugadorRival>({ nombre: '', dorsal: '', posicion: '', edad: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNuevoJugador({ ...nuevoJugador, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    if (nuevoJugador.nombre && nuevoJugador.dorsal) {
      setJugadores([...jugadores, nuevoJugador]);
      setNuevoJugador({ nombre: '', dorsal: '', posicion: '', edad: '' });
    }
  };

  return (
    <div>
      <h2>Agregar Jugadores Rivales</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input name="nombre" placeholder="Nombre" value={nuevoJugador.nombre} onChange={handleChange} />
        <input name="dorsal" placeholder="Dorsal" value={nuevoJugador.dorsal} onChange={handleChange} />
        <input name="posicion" placeholder="Posición" value={nuevoJugador.posicion} onChange={handleChange} />
        <input name="edad" placeholder="Edad" value={nuevoJugador.edad} onChange={handleChange} />
        <button onClick={handleAdd}>Añadir</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dorsal</th>
            <th>Posición</th>
            <th>Edad</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j, idx) => (
            <tr key={idx}>
              <td>{j.nombre}</td>
              <td>{j.dorsal}</td>
              <td>{j.posicion}</td>
              <td>{j.edad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FormularioJugadoresRivales;
