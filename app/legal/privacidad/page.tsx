import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Política de privacidad' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="22/10/2026">
      <h2>Qué datos guardamos</h2>
      <ul>
        <li>Tu email y contraseña (cifrada), o tu cuenta de Google si ingresas con ella.</li>
        <li>Tu perfil: nombre de usuario, nombre visible, avatar, bio y plataformas.</li>
        <li>Tu actividad: favoritos, comentarios, likes, seguidores y bloqueos.</li>
      </ul>
      <h2>Quién ve qué</h2>
      <ul>
        <li>Tu perfil, favoritos y comentarios son públicos, salvo que marques tu perfil como privado.</li>
        <li>Con perfil privado, solo los seguidores que apruebes ven tus favoritos.</li>
        <li>Tu email solo lo ves tú. Nadie ve a qué comentarios diste like: solo se muestra el total.</li>
        <li>Quien bloqueas no puede ver tu perfil ni tus comentarios.</li>
      </ul>
      <h2>Tus derechos</h2>
      <p>
        Puedes ver y corregir tus datos desde Ajustes, y borrar tu cuenta con todos sus datos en cualquier momento.
        Aplicamos la norma más exigente entre las de los países donde operamos: Ley 1581 de 2012 (Colombia), Ley Federal
        de Protección de Datos Personales en Posesión de los Particulares (México), Ley 25.326 (Argentina) y Ley 19.628
        (Chile).
      </p>
      <h2>Servicios que usamos</h2>
      <p>
        Supabase (base de datos y autenticación) y Vercel (alojamiento). No vendemos tus datos ni los compartimos con
        anunciantes.
      </p>
    </LegalPage>
  )
}
