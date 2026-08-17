export const SECTORS = [
  "Industrie",
  "Santé",
  "Finance & Assurance",
  "Commerce & Distribution",
  "Services",
  "Transport & Logistique",
  "Éducation",
  "Tourisme & Hôtellerie",
  "Agroalimentaire",
  "BTP & Immobilier",
  "Technologies & Télécoms",
  "Autre",
] as const;

export const COMPANY_SIZES = [
  "1-10 employés",
  "11-50 employés",
  "51-200 employés",
  "Plus de 200 employés",
] as const;

export const REGIONS = [
  "Casablanca-Settat",
  "Rabat-Salé-Kénitra",
  "Marrakech-Safi",
  "Fès-Meknès",
  "Tanger-Tétouan-Al Hoceïma",
  "Souss-Massa",
  "Oriental",
  "Béni Mellal-Khénifra",
  "Drâa-Tafilalet",
  "Guelmim-Oued Noun",
  "Laâyoune-Sakia El Hamra",
  "Dakhla-Oued Ed-Dahab",
] as const;

export const AUDITOR_ENTITIES = ["CMRPI", "AUSIM", "ADD", "Autre cabinet"] as const;

const FREE_MAIL = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.fr", "icloud.com"];

export function isFreeMailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && FREE_MAIL.includes(domain);
}

export function passwordStrength(pwd: string) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Fort", "Excellent"];
  return { score, label: labels[score] ?? "Très faible" };
}
