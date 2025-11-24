import { HemogramReference, HemogramReferenceValue } from "@/types/exam";

// Dados de referência para Hemograma (cão e gato)
export const hemogramReferences: Record<string, HemogramReference> = {
  eritrocitos: { dog: { full: "5.5 - 8.5 milhões/mm3", min: 5.5, max: 8.5 }, cat: { full: "6.5 - 10.0 milhões/mm3", min: 6.5, max: 10.0 } },
  hemoglobina: { dog: { full: "12.0 - 18.0 g/dL", min: 12.0, max: 18.0 }, cat: { full: "9.0 - 15.0 g/dL", min: 9.0, max: 15.0 } },
  hematocrito: { dog: { full: "37 - 55 %", min: 37, max: 55 }, cat: { full: "30 - 45 %", min: 30, max: 45 } },
  vcm: { dog: { full: "60.0 - 77.0 fL", min: 60.0, max: 77.0 }, cat: { full: "39.0 - 55.0 fL", min: 39.0, max: 55.0 } },
  hcm: { dog: { full: "19.5 - 24.5 pg", min: 19.5, max: 24.5 }, cat: { full: "13.0 - 17.0 pg", min: 13.0, max: 17.0 } },
  chcm: { dog: { full: "31 - 35 %", min: 31, max: 35 }, cat: { full: "30 - 36 %", min: 30, max: 36 } },
  rdw: { dog: { full: "11.5 - 14.5 %", min: 11.5, max: 14.5 }, cat: { full: "11.5 - 14.5 %", min: 11.5, max: 14.5 } },
  proteinaTotal: { dog: { full: "6.0 - 8.0 g/dL", min: 6.0, max: 8.0 }, cat: { full: "5.7 - 8.9 g/dL", min: 5.7, max: 8.9 } },
  hemaciasNucleadas: { dog: { full: "0", min: 0, max: 0 }, cat: { full: "0", min: 0, max: 0 } },

  leucocitosTotais: { 
    dog: { 
      relative: "0 - 100 %", 
      absolute: "6.0 - 17.0 mil/µL", 
      min: 6.0, 
      max: 17.0 
    }, 
    cat: { 
      relative: "0 - 100 %", 
      absolute: "5.5 - 19.5 mil/µL", 
      min: 5.5, 
      max: 19.5 
    } 
  },
  mielocitos: {
    dog: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 },
    cat: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 }
  },
  metamielocitos: {
    dog: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 },
    cat: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 }
  },
  bastonetes: {
    dog: { relative: "0 - 3 %", absolute: "0 - 300 /µL", min: 0, max: 3 },
    cat: { relative: "0 - 3 %", absolute: "0 - 300 /µL", min: 0, max: 3 }
  },
  segmentados: {
    dog: { relative: "60 - 77 %", absolute: "3.000 - 11.500 /µL", min: 60, max: 77 },
    cat: { relative: "35 - 75 %", absolute: "2.500 - 12.500 /µL", min: 35, max: 75 }
  },
  eosinofilos: {
    dog: { relative: "2 - 10 %", absolute: "100 - 1.250 /µL", min: 2, max: 10 },
    cat: { relative: "2 - 12 %", absolute: "100 - 1.500 /µL", min: 2, max: 12 }
  },
  basofilos: {
    dog: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 },
    cat: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 }
  },
  linfocitos: {
    dog: { relative: "12 - 30 %", absolute: "1.000 - 4.800 /µL", min: 12, max: 30 },
    cat: { relative: "20 - 55 %", absolute: "1.500 - 7.000 /µL", min: 20, max: 55 }
  },
  monocitos: {
    dog: { relative: "3 - 10 %", absolute: "150 - 1.350 /µL", min: 3, max: 10 },
    cat: { relative: "1 - 4 %", absolute: "50 - 500 /µL", min: 1, max: 4 }
  },
  contagemPlaquetaria: { dog: { full: "166.000 - 575.000 /µL", min: 166000, max: 575000 }, cat: { full: "150.000 - 600.000 /µL", min: 150000, max: 600000 } },
};