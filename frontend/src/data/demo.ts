/**
 * @fileoverview Datos iniciales para el equipo CD Derio
 * @description Datos realistas para que todas las tablas muestren funcionalidades:
 * búsqueda, ordenamiento, paginación y exportación.
 */

import type { Player } from '@modules/plantilla';
import type { StaffMember } from '@modules/staff';
import type { CompetitionTeam } from '@modules/competicion';

// ============================================================================
// JUGADORES DEMO (25 jugadores — activa paginación y búsqueda)
// ============================================================================

export const DEMO_PLAYERS: Player[] = [
  // ── PORTEROS ──────────────────────────────────────────────────────────────
  { id: 1, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 1, nombre: 'Jon García', posicion: 'Portero', posicionJuego: 'Portero', perfil: 'D', fechaNacimiento: '2003-06-15' },
  { id: 2, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 25, nombre: 'J. Blas', posicion: 'Portero', posicionJuego: 'Portero', perfil: 'D' },
  { id: 3, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 13, nombre: 'Kevin Ríos', posicion: 'Portero', posicionJuego: 'Portero', perfil: 'D', fechaNacimiento: '2003-09-20' },

  // ── DEFENSAS ──────────────────────────────────────────────────────────────
  { id: 4, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 17, nombre: 'Egileor', posicion: 'Defensa', posicionJuego: 'Central', perfil: 'D', fechaNacimiento: '1997-08-12' },
  { id: 5, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 18, nombre: 'A. Calle', posicion: 'Defensa', posicionJuego: 'Lateral Derecho', perfil: 'D' },
  { id: 6, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 2, nombre: 'Asier Imaz', posicion: 'Defensa', posicionJuego: 'Lateral Derecho', perfil: 'D', fechaNacimiento: '2004-05-22' },
  { id: 7, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 4, nombre: 'Daniel Jimenez', posicion: 'Defensa', posicionJuego: 'Central', perfil: 'D', fechaNacimiento: '2001-11-08' },
  { id: 8, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 22, nombre: 'I. Del Campo', posicion: 'Defensa', posicionJuego: 'Lateral Izquierdo', perfil: 'I', fechaNacimiento: '2005-03-14' },
  { id: 9, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 3, nombre: 'J. Etxeandia', posicion: 'Defensa', posicionJuego: 'Central', perfil: 'D', fechaNacimiento: '2001-07-30' },
  { id: 10, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 8, nombre: 'Guipu', posicion: 'Defensa', posicionJuego: 'Central', perfil: 'D', fechaNacimiento: '1993-10-05' },
  { id: 11, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 5, nombre: 'Unai Lechosa', posicion: 'Defensa', posicionJuego: 'Central', perfil: 'D', fechaNacimiento: '2004-04-18' },
  { id: 12, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 15, nombre: 'Uztaritz Expósito', posicion: 'Defensa', posicionJuego: 'Lateral Izquierdo', perfil: 'I', fechaNacimiento: '2006-01-25' },

  // ── MEDIOS ────────────────────────────────────────────────────────────────
  { id: 13, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 21, nombre: 'Ander Honrado', posicion: 'Medio', posicionJuego: 'Pivote', perfil: 'D', fechaNacimiento: '2006-06-10' },
  { id: 14, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 10, nombre: 'G. Carrera', posicion: 'Medio', posicionJuego: 'Mediapunta', perfil: 'D', fechaNacimiento: '2000-12-03' },
  { id: 15, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 21, nombre: 'Montes', posicion: 'Medio', posicionJuego: 'Interior', perfil: 'D', fechaNacimiento: '1998-05-17' },
  { id: 16, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 6, nombre: 'Markel Mayo', posicion: 'Medio', posicionJuego: 'Pivote', perfil: 'D', fechaNacimiento: '2000-09-28' },
  { id: 17, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 26, nombre: 'S. Urruticoechea', posicion: 'Medio', posicionJuego: 'Interior', perfil: 'D' },
  { id: 18, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 24, nombre: 'Unax Boada', posicion: 'Medio', posicionJuego: 'Interior', perfil: 'I', fechaNacimiento: '2006-08-14' },
  { id: 19, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 23, nombre: 'X. Ugalde', posicion: 'Medio', posicionJuego: 'Mediapunta', perfil: 'D', fechaNacimiento: '2006-04-22' },

  // ── DELANTEROS ─────────────────────────────────────────────────────────────
  { id: 20, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 9, nombre: 'Á. Fernández', posicion: 'Delantero', posicionJuego: 'Delantero Centro', perfil: 'D', fechaNacimiento: '2001-03-11' },
  { id: 21, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 20, nombre: 'Ander De La Parra', posicion: 'Delantero', posicionJuego: 'Extremo Derecho', perfil: 'D', fechaNacimiento: '2003-07-06' },
  { id: 22, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 14, nombre: 'Ander Gonzalo', posicion: 'Delantero', posicionJuego: 'Extremo Izquierdo', perfil: 'I', fechaNacimiento: '1996-11-19' },
  { id: 23, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 16, nombre: 'C. Gabiña', posicion: 'Delantero', posicionJuego: 'Extremo Derecho', perfil: 'D', fechaNacimiento: '2005-02-08' },
  { id: 24, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 11, nombre: 'Julen Barrón', posicion: 'Delantero', posicionJuego: 'Extremo Izquierdo', perfil: 'I', fechaNacimiento: '2001-08-23' },
  { id: 25, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 7, nombre: 'Mikel', posicion: 'Delantero', posicionJuego: 'Extremo Derecho', perfil: 'D', fechaNacimiento: '2002-12-15' },
  { id: 26, fotoUrl: 'N', competicion: 'Tercera Federación', club: 'CD Derio', equipo: 'Primer Equipo', dorsal: 19, nombre: 'M. Moral', posicion: 'Delantero', posicionJuego: 'Delantero Centro', perfil: 'D' },
];

// ============================================================================
// STAFF DEMO (Personal)
// ============================================================================

export const DEMO_STAFF: StaffMember[] = [];

// ============================================================================
// EQUIPOS COMPETICIÓN DEMO (18 equipos — tabla clasificación completa)
// ============================================================================

export const DEMO_COMPETITION_TEAMS: CompetitionTeam[] = [
  { id: 1, nombre: 'CD Derio', estadio: 'Municipal de Derio', localidad: 'Derio', logoUrl: '/logos/cd-derio.png' },
  { id: 2, nombre: 'Lagun Onak', estadio: 'Urbieta', localidad: 'Bergara', logoUrl: 'https://ui-avatars.com/api/?name=LO&background=059669&color=fff&size=64&bold=true' },
  { id: 3, nombre: 'Aurrera Ondarroa', estadio: 'Martiaran', localidad: 'Ondarroa', logoUrl: 'https://ui-avatars.com/api/?name=AO&background=dc2626&color=fff&size=64&bold=true' },
  { id: 4, nombre: 'Basconia', estadio: 'Fadura', localidad: 'Getxo', logoUrl: 'https://ui-avatars.com/api/?name=BAS&background=7c3aed&color=fff&size=64&bold=true' },
  { id: 5, nombre: 'SD Deusto', estadio: 'Maloste', localidad: 'Bilbao', logoUrl: 'https://ui-avatars.com/api/?name=SDD&background=2563eb&color=fff&size=64&bold=true' },
  { id: 6, nombre: 'Urgatzi', estadio: 'Kukullaga', localidad: 'Galdakao', logoUrl: 'https://ui-avatars.com/api/?name=URG&background=ea580c&color=fff&size=64&bold=true' },
  { id: 7, nombre: 'Santutxu FC', estadio: 'Mallona', localidad: 'Bilbao', logoUrl: 'https://ui-avatars.com/api/?name=SF&background=0891b2&color=fff&size=64&bold=true' },
  { id: 8, nombre: 'Sodupe', estadio: 'El Prado', localidad: 'Güeñes', logoUrl: 'https://ui-avatars.com/api/?name=SOD&background=65a30d&color=fff&size=64&bold=true' },
  { id: 9, nombre: 'Urduliz', estadio: 'Erandio', localidad: 'Urduliz' },
  { id: 10, nombre: 'Padura', estadio: 'San Juan', localidad: 'Arrigorriaga', logoUrl: 'https://ui-avatars.com/api/?name=PAD&background=ca8a04&color=fff&size=64&bold=true' },
  { id: 11, nombre: 'CD Basconia B', estadio: 'Fadura B', localidad: 'Getxo' },
  { id: 12, nombre: 'Erandio', estadio: 'Astrabudua', localidad: 'Erandio', logoUrl: 'https://ui-avatars.com/api/?name=ERA&background=0284c7&color=fff&size=64&bold=true' },
  { id: 13, nombre: 'Ortuella', estadio: 'La Arboleda', localidad: 'Ortuella' },
  { id: 14, nombre: 'Gernika', estadio: 'Urbieta', localidad: 'Gernika', logoUrl: 'https://ui-avatars.com/api/?name=GER&background=b91c1c&color=fff&size=64&bold=true' },
  { id: 15, nombre: 'Arratia', estadio: 'Igorre', localidad: 'Igorre' },
  { id: 16, nombre: 'Plentzia', estadio: 'Plentzia', localidad: 'Plentzia', logoUrl: 'https://ui-avatars.com/api/?name=PLE&background=4f46e5&color=fff&size=64&bold=true' },
  { id: 17, nombre: 'Algorta', estadio: 'Fadura C', localidad: 'Getxo' },
  { id: 18, nombre: 'Danok Bat', estadio: 'San Ignacio', localidad: 'Bilbao', logoUrl: 'https://ui-avatars.com/api/?name=DB&background=be185d&color=fff&size=64&bold=true' },
  { id: 19, nombre: 'Portugalete', estadio: 'La Florida', localidad: 'Portugalete', logoUrl: '/logos/portugalete.png' },
  { id: 20, nombre: 'SD Leioa', estadio: 'Sarriena', localidad: 'Leioa', logoUrl: '/logos/leioa.png' },
  { id: 21, nombre: 'Athletic Club', estadio: 'San Mamés', localidad: 'Bilbao', logoUrl: '/logos/athletic-club.png' },
];

// ============================================================================
// JUGADORES ESCUELA HUESCA — CADETE A (nacidos 2010)
// ============================================================================

export const HUESCA_CADETE_A_PLAYERS: Player[] = [
  // ── PORTEROS ──
  { id: 100, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 1,  nombre: 'Sergio Junquera',   posicion: 'Portero',   posicionJuego: 'Portero',          perfil: 'D', fechaNacimiento: '2010-06-28' },
  { id: 101, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 13, nombre: 'Reid Way',           posicion: 'Portero',   posicionJuego: 'Portero',          perfil: 'D', fechaNacimiento: '2010-10-10' },

  // ── DEFENSAS ──
  { id: 102, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 2,  nombre: 'Samuel Munoz',       posicion: 'Defensa',   posicionJuego: 'Lateral',           perfil: 'D', fechaNacimiento: '2010-09-02' },
  { id: 103, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 4,  nombre: 'Lorien Barrio',      posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'D', fechaNacimiento: '2010-02-06' },
  { id: 104, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 5,  nombre: 'Gonzalo Rivas',      posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'D', fechaNacimiento: '2010-05-03' },
  { id: 105, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 3,  nombre: 'Tristan Forster',    posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'D', fechaNacimiento: '2010-07-23' },
  { id: 106, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 15, nombre: 'Izak Mcelligott',    posicion: 'Defensa',   posicionJuego: 'Lateral',           perfil: 'I', fechaNacimiento: '2010-12-12' },

  // ── MEDIOS ──
  { id: 107, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 6,  nombre: 'Marcos Angulo',      posicion: 'Medio',     posicionJuego: 'Pivote',            perfil: 'D', fechaNacimiento: '2010-03-03' },
  { id: 108, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 8,  nombre: 'Buba Diallo',        posicion: 'Medio',     posicionJuego: 'Pivote',            perfil: 'D', fechaNacimiento: '2010-12-31' },
  { id: 109, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 10, nombre: 'Zahars Maligns',     posicion: 'Medio',     posicionJuego: 'Mediapunta',        perfil: 'D', fechaNacimiento: '2010-10-09' },
  { id: 110, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 14, nombre: 'Kaasha Halley',      posicion: 'Medio',     posicionJuego: 'Interior',          perfil: 'D', fechaNacimiento: '2010-07-25' },
  { id: 111, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 12, nombre: 'Jacobo Hidalgo',     posicion: 'Medio',     posicionJuego: 'Interior',          perfil: 'D', fechaNacimiento: '2010-01-19' },

  // ── DELANTEROS ──
  { id: 112, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 11, nombre: 'Jayden Mapilele',    posicion: 'Delantero', posicionJuego: 'Extremo',           perfil: 'D', fechaNacimiento: '2010-11-06' },
  { id: 113, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 9,  nombre: 'Zsombor Molnar',     posicion: 'Delantero', posicionJuego: 'Delantero Centro',  perfil: 'D', fechaNacimiento: '2010-04-22' },
  { id: 114, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 7,  nombre: 'Nito Dual',          posicion: 'Delantero', posicionJuego: 'Delantero Centro',  perfil: 'D', fechaNacimiento: '2010-01-31' },
  { id: 115, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 16, nombre: 'Isaac Mellado',      posicion: 'Delantero', posicionJuego: 'Extremo',           perfil: 'D', fechaNacimiento: '2010-11-26' },
  { id: 116, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Cadete A', dorsal: 17, nombre: 'Ivan Garcia',        posicion: 'Delantero', posicionJuego: 'Delantero Centro',  perfil: 'D', fechaNacimiento: '2010-08-17' },
];

// ============================================================================
// JUGADORES ESCUELA HUESCA — JUVENIL A (nacidos 2007-2009)
// ============================================================================

export const HUESCA_JUVENIL_A_PLAYERS: Player[] = [
  // ── PORTEROS ──
  { id: 200, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 1,  nombre: 'Andres Ester',              posicion: 'Portero',   posicionJuego: 'Portero',          perfil: 'D', fechaNacimiento: '2007-02-01' },
  { id: 201, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 13, nombre: 'Shek Tuscany',              posicion: 'Portero',   posicionJuego: 'Portero',          perfil: 'D', fechaNacimiento: '2007-09-17' },

  // ── DEFENSAS ──
  { id: 202, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 2,  nombre: 'Caden Barry',               posicion: 'Defensa',   posicionJuego: 'Lateral',           perfil: 'D', fechaNacimiento: '2007-01-31' },
  { id: 203, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 15, nombre: 'Anderson Arboleda',          posicion: 'Defensa',   posicionJuego: 'Lateral',           perfil: 'D', fechaNacimiento: '2007-11-29' },
  { id: 204, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 4,  nombre: 'Fernando Puertas',           posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'D', fechaNacimiento: '2007-10-01' },
  { id: 205, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 5,  nombre: 'Tibu Fernandez',             posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'I', fechaNacimiento: '2007-09-22' },
  { id: 206, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 3,  nombre: 'Miguel Sopena',              posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'D', fechaNacimiento: '2009-10-20' },
  { id: 207, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 14, nombre: 'Yu Ching Wai',               posicion: 'Defensa',   posicionJuego: 'Central',           perfil: 'I', fechaNacimiento: '2007-08-17' },
  { id: 208, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 16, nombre: 'Alex Bara',                  posicion: 'Defensa',   posicionJuego: 'Lateral',           perfil: 'I', fechaNacimiento: '2007-01-09' },

  // ── MEDIOS ──
  { id: 209, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 6,  nombre: 'Ruben Lamarca',              posicion: 'Medio',     posicionJuego: 'Pivote',            perfil: 'D', fechaNacimiento: '2008-03-03' },
  { id: 210, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 8,  nombre: 'Dario Anadon',               posicion: 'Medio',     posicionJuego: 'Pivote',            perfil: 'D', fechaNacimiento: '2007-08-30' },
  { id: 211, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 12, nombre: 'Stevan Reina',               posicion: 'Medio',     posicionJuego: 'Pivote',            perfil: 'D', fechaNacimiento: '2008-05-25' },
  { id: 212, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 10, nombre: 'Lennyx Perry',               posicion: 'Medio',     posicionJuego: 'Interior',          perfil: 'D', fechaNacimiento: '2007-07-17' },
  { id: 213, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 18, nombre: 'Denis Eduard',               posicion: 'Medio',     posicionJuego: 'Interior',          perfil: 'D', fechaNacimiento: '2008-06-12' },
  { id: 214, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 20, nombre: 'David Villabona',            posicion: 'Medio',     posicionJuego: 'Interior',          perfil: 'D', fechaNacimiento: '2007-04-04' },

  // ── DELANTEROS ──
  { id: 215, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 9,  nombre: 'Dimitar Dogramadzhiev',      posicion: 'Delantero', posicionJuego: 'Delantero Centro',  perfil: 'D', fechaNacimiento: '2007-03-15' },
  { id: 216, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 7,  nombre: 'Romeo Lite',                 posicion: 'Delantero', posicionJuego: 'Delantero Centro',  perfil: 'D', fechaNacimiento: '2007-05-09' },
  { id: 217, fotoUrl: 'N', competicion: 'Fútbol Base', club: 'ESCUELA HUESCA', equipo: 'Juvenil A', dorsal: 11, nombre: 'Waisea Henry',               posicion: 'Delantero', posicionJuego: 'Extremo',           perfil: 'D', fechaNacimiento: '2007-01-31' },
];

// ============================================================================
// JUGADORES ARENAS CLUB — JUVENIL A (nuevos jugadores con nombres comunes)
// ============================================================================

export const ARENAS_JUVENIL_A_PLAYERS: Player[] = [
  // ── DEFENSAS ──
  { id: 300, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 2,  nombre: 'Carlos García',         posicion: 'Defensa', posicionJuego: 'Lateral Izquierdo', perfil: 'I', fechaNacimiento: '2010-03-22' },
  { id: 301, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 3,  nombre: 'Juan López',           posicion: 'Defensa', posicionJuego: 'Central',            perfil: 'D', fechaNacimiento: '2009-05-10' },
  { id: 302, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 4,  nombre: 'Miguel Rodríguez',     posicion: 'Defensa', posicionJuego: 'Central',            perfil: 'D', fechaNacimiento: '2010-07-14' },
  { id: 303, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 5,  nombre: 'David Sánchez',        posicion: 'Defensa', posicionJuego: 'Lateral Derecho',    perfil: 'D', fechaNacimiento: '2009-09-08' },
  { id: 304, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 13, nombre: 'Luis Martínez',        posicion: 'Defensa', posicionJuego: 'Lateral Izquierdo', perfil: 'I', fechaNacimiento: '2010-01-30' },
  { id: 305, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 18, nombre: 'Ángel Pérez',          posicion: 'Defensa', posicionJuego: 'Central',            perfil: 'I', fechaNacimiento: '2010-11-09' },

  // ── DELANTEROS ──
  { id: 306, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 9,  nombre: 'Francisco Torres',     posicion: 'Delantero', posicionJuego: 'Delantero Centro', perfil: 'D', fechaNacimiento: '2010-06-19' },
  { id: 307, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 11, nombre: 'Enrique Morales',      posicion: 'Delantero', posicionJuego: 'Extremo Izquierdo', perfil: 'I', fechaNacimiento: '2009-10-17' },
  { id: 308, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 16, nombre: 'Rafael Jiménez',      posicion: 'Delantero', posicionJuego: 'Delantero Centro', perfil: 'I', fechaNacimiento: '2010-07-11' },
  { id: 309, fotoUrl: 'D', competicion: 'Fútbol Base', club: 'ARENAS CLUB', equipo: 'Juvenil A', dorsal: 20, nombre: 'Andrés Ruiz',         posicion: 'Delantero', posicionJuego: 'Extremo Derecho',  perfil: 'D', fechaNacimiento: '2009-04-26' },
];

// ============================================================================
// USUARIOS DEMO (12 usuarios — suficiente para paginación)
// ============================================================================

export interface DemoUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'Administrador' | 'Responsable' | 'Tecnico';
  estado: 'Activo' | 'Inactivo';
  ultimoAcceso?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: 1, nombre: 'Iker Muniain', email: 'iker.muniain@cdderio.eus', rol: 'Administrador', estado: 'Activo', ultimoAcceso: '2026-02-07 09:15' },
  { id: 2, nombre: 'Iñigo Larrañaga', email: 'inigo@cdderio.eus', rol: 'Responsable', estado: 'Activo', ultimoAcceso: '2026-02-07 08:30' },
  { id: 3, nombre: 'Aitor Etxeberria', email: 'aitor@cdderio.eus', rol: 'Tecnico', estado: 'Activo', ultimoAcceso: '2026-02-06 17:45' },
  { id: 4, nombre: 'Nerea Gaztañaga', email: 'nerea@cdderio.eus', rol: 'Tecnico', estado: 'Activo', ultimoAcceso: '2026-02-07 10:00' },
  { id: 5, nombre: 'Koldo Bizkarra', email: 'koldo@cdderio.eus', rol: 'Tecnico', estado: 'Activo', ultimoAcceso: '2026-02-05 14:20' },
  { id: 6, nombre: 'Miren Arrieta', email: 'miren@cdderio.eus', rol: 'Tecnico', estado: 'Activo', ultimoAcceso: '2026-02-04 11:00' },
  { id: 7, nombre: 'Patxi Urizar', email: 'patxi@cdderio.eus', rol: 'Tecnico', estado: 'Inactivo', ultimoAcceso: '2025-12-10 16:30' },
  { id: 8, nombre: 'Gaizka Landa', email: 'gaizka@cdderio.eus', rol: 'Administrador', estado: 'Activo', ultimoAcceso: '2026-02-07 11:45' },
  { id: 9, nombre: 'Iker Villanueva', email: 'iker@cdderio.eus', rol: 'Responsable', estado: 'Activo', ultimoAcceso: '2026-02-06 20:15' },
  { id: 10, nombre: 'Amaia Garmendia', email: 'amaia@cdderio.eus', rol: 'Tecnico', estado: 'Activo', ultimoAcceso: '2026-02-07 07:50' },
  { id: 11, nombre: 'Ekaitz Solabarrieta', email: 'ekaitz@cdderio.eus', rol: 'Tecnico', estado: 'Inactivo', ultimoAcceso: '2025-11-22 09:00' },
  { id: 12, nombre: 'Aritz Odriozola', email: 'aritz@cdderio.eus', rol: 'Responsable', estado: 'Activo', ultimoAcceso: '2026-02-06 19:30' },
];
