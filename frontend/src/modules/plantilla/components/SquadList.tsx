import React from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '../types';

interface SquadListProps {
  squad: Player[];
}

const formatDate = (dateStr?: string, locale: string = 'es') => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // fallback if invalid
  return d.toLocaleDateString(locale);
};

const SquadList: React.FC<SquadListProps> = ({ squad }) => {
  const { t, i18n } = useTranslation();
  return (
    <section id="squad" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-display font-black text-red-900 uppercase mb-12 text-center">{t('squadList.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {squad.map((player) => (
            <div key={player.id} className="group relative bg-gray-900 rounded-3xl overflow-hidden aspect-3/4 shadow-xl">
              {player.fotoUrl.length === 1 ? (
                <div className="w-full h-full bg-red-800 flex items-center justify-center text-7xl font-black text-white/20">
                  {player.fotoUrl}
                </div>
              ) : (
                <img loading="lazy" decoding="async" 
                  src={player.fotoUrl} 
                  alt={player.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-red-900/90 via-transparent to-transparent"></div>
              <div className="absolute top-4 right-4 bg-white text-red-900 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl shadow-lg">
                {player.dorsal}
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-1">{player.posicion}</p>
                <h3 className="text-2xl font-display font-bold text-white uppercase">{player.nombre}</h3>
                {player.fechaNacimiento && (
                  <div className="text-white text-xs mt-1">
                    {formatDate(player.fechaNacimiento, i18n.language)}
                  </div>
                )}
                <div className="h-1 w-12 bg-white mt-3 group-hover:w-full transition-all duration-300"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SquadList;
