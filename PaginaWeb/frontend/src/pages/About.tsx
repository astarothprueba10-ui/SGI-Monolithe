import { CompassIcon, EyeIcon, TargetIcon } from 'lucide-react';
import { PageHero } from '../components/public/PageHero';
import { LinkButton } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Primitives';
import { IMAGES } from '../data/projects';
import { milestones, values } from '../data/site';

const stats = [
  {
    value: 'SUNARP',
    label: 'Lotes independizados e inscritos'
  },
  {
    value: '450 m²',
    label: 'Área de lote desde'
  },
  {
    value: '30 min',
    label: 'Aprox. desde Chiclayo'
  },
  {
    value: '36 meses',
    label: 'Financiamiento hasta'
  }
];

export function About() {
  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Nosotros' }
        ]}
        eyebrow="Nosotros"
        title="Construimos relaciones basadas en confianza"
        description="MONOLITHE es una empresa inmobiliaria orientada al desarrollo y comercialización de proyectos que buscan ofrecer alternativas de vivienda e inversión."
        image={IMAGES.heroAvenue}
      />

      {/* Quiénes somos */}
      <section className="bg-white py-20 lg:py-28">
        <div className="shell grid gap-12 lg:grid-cols-2 lg:items-center">
          <img
            src={IMAGES.team}
            alt="Atención inmobiliaria de MONOLITHE"
            className="aspect-[3/2] w-full rounded-2xl object-cover shadow-card"
          />

          <div>
            <SectionHeading
              eyebrow="Quiénes somos"
              title="Una propuesta inmobiliaria que busca crecer junto a sus clientes"
              description="MONOLITHE desarrolla su actividad inmobiliaria con el propósito de brindar información clara, atención cercana y alternativas de adquisición adaptadas a las necesidades de sus clientes."
            />

            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Actualmente desarrollamos el Condominio Campestre Los Cocos,
              ubicado en Picsi, Chiclayo. Todos los lotes del proyecto se
              encuentran debidamente independizados e inscritos en el Registro
              de Predios de la SUNARP, contando cada uno con su propia partida
              registral electrónica. Nuestro proceso comercial comprende la
              orientación al cliente, coordinación de visitas al terreno,
              elección del lote, formalización de la compra y seguimiento
              durante el proceso de pago.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="border-l-2 border-gold pl-4"
                >
                  <dt className="font-display text-3xl text-night">
                    {stat.value}
                  </dt>

                  <dd className="mt-1 text-[13px] leading-snug text-muted">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Historia */}
      <section className="bg-bone py-20 lg:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="Nuestra historia"
            title="Una empresa en crecimiento"
            description="Nuestra historia continúa construyéndose a medida que fortalecemos nuestros proyectos, procesos y relación con los clientes."
          />

          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {milestones.map((milestone) => (
              <li
                key={milestone.year}
                className="relative rounded-xl border border-line bg-white p-6"
              >
                <span className="font-display text-2xl text-gold-600">
                  {milestone.year}
                </span>

                <h3 className="mt-3 text-[15px] font-semibold text-night">
                  {milestone.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {milestone.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="bg-night py-20 lg:py-24">
        <div className="shell grid gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/12 bg-white/[0.04] p-8">
            <TargetIcon
              className="h-7 w-7 text-gold"
              strokeWidth={1.5}
            />

            <h2 className="mt-5 font-display text-2xl text-white">
              Misión
            </h2>

            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Desarrollar y comercializar alternativas inmobiliarias mediante
              una atención cercana, información clara y procesos responsables,
              acompañando a nuestros clientes durante las diferentes etapas de
              su decisión de compra.
            </p>
          </article>

          <article className="rounded-2xl border border-white/12 bg-white/[0.04] p-8">
            <EyeIcon
              className="h-7 w-7 text-gold"
              strokeWidth={1.5}
            />

            <h2 className="mt-5 font-display text-2xl text-white">
              Visión
            </h2>

            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Consolidarnos como una empresa inmobiliaria reconocida por la
              confianza de sus clientes, la mejora continua de sus procesos y
              el desarrollo responsable de sus proyectos.
            </p>
          </article>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-white py-20 lg:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading
            eyebrow="Nuestros valores"
            title="Principios que orientan nuestra forma de trabajar"
            description="Estos principios representan la manera en que buscamos relacionarnos con nuestros clientes y desarrollar nuestros procesos."
          />

          <ul className="grid gap-5 sm:grid-cols-2">
            {values.map((value) => (
              <li
                key={value.title}
                className="rounded-xl bg-bone p-6"
              >
                <CompassIcon
                  className="h-5 w-5 text-brand"
                  strokeWidth={1.6}
                />

                <h3 className="mt-4 text-[15px] font-semibold text-night">
                  {value.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {value.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bone py-16">
        <div className="shell flex flex-col items-center gap-6 rounded-2xl bg-night px-8 py-12 text-center">
          <h2 className="max-w-2xl font-display text-3xl leading-tight text-white sm:text-4xl">
            ¿Quieres conocer Los Cocos?
          </h2>

          <p className="max-w-xl text-[15px] text-white/70">
            Podemos coordinar una visita al proyecto para que conozcas el
            terreno y recibas información sobre lotes, precios y alternativas
            de financiamiento.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton
              to="/proyectos"
              size="lg"
            >
              Ver proyecto
            </LinkButton>

            <LinkButton
              to="/contacto"
              size="lg"
              variant="secondary"
              className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white hover:text-night"
            >
              Agendar una visita
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}