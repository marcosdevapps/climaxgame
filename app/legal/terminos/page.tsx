import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Términos y condiciones' }

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updated="22/10/2026">
      <h2>1. Qué es ClimaxGame</h2>
      <p>
        ClimaxGame es una red social de videojuegos en español: puedes guardar juegos favoritos, comentar, dar likes y
        seguir a otras personas. El catálogo de juegos proviene de IGDB.com.
      </p>
      <h2>2. Tu cuenta</h2>
      <p>
        Debes tener al menos 13 años. Eres responsable de lo que publicas y de mantener segura tu contraseña. Puedes
        borrar tu cuenta y todos tus datos en cualquier momento desde Ajustes.
      </p>
      <h2>3. Reglas de la comunidad</h2>
      <ul>
        <li>Sin insultos, acoso, discriminación ni contenido sexual o violento explícito.</li>
        <li>Sin spam ni publicidad. Las cuentas con menos de 7 días no pueden publicar enlaces.</li>
        <li>Marca como spoiler los comentarios que revelen la trama.</li>
        <li>Límite de 10 comentarios y 100 likes por hora.</li>
      </ul>
      <h2>4. Moderación</h2>
      <p>
        Cualquier persona puede reportar un comentario. Con tres reportes de usuarios distintos el comentario se oculta
        hasta que un moderador lo revise. Los moderadores pueden restaurar o borrar comentarios y suspender cuentas por
        7 días o de forma permanente. Si borramos un comentario tuyo, te avisamos con el motivo.
      </p>
      <h2>5. Contenido</h2>
      <p>
        Conservas los derechos sobre lo que escribes, y nos autorizas a mostrarlo en ClimaxGame. Las portadas, capturas
        y datos de los juegos pertenecen a sus respectivos dueños.
      </p>
    </LegalPage>
  )
}
