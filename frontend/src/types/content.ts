export type ProjectStatus = 'Preventa' | 'En venta' | 'Próximamente';

export interface Project {
  slug: string;
  name: string;
  location: string;
  status: ProjectStatus;
  type: string;
  priceFrom: string;
  areaFrom: string;
  shortDescription: string;
  description: string;
  cover: string;
  gallery: {src: string;caption: string;}[];
  financing: {
    cash: string;
    downPayment: string;
    months: string;
    note: string;
  };
  highlights: string[];
  published: boolean;
  updatedAt: string;
}

export interface BenefitCategory {
  id: string;
  title: string;
  intro: string;
  image: string;
  items: {name: string;description: string;icon: string;}[];
}

export interface ChangeLogEntry {
  id: string;
  section: string;
  user: string;
  date: string;
  state: 'Publicado' | 'Borrador' | 'En revisión';
}