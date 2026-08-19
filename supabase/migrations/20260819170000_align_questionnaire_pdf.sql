UPDATE public.audit_questions
SET axis = CASE sort_order
  WHEN 1 THEN 'Contexte et exposition aux risques'
  WHEN 2 THEN 'Contexte et exposition aux risques'
  WHEN 3 THEN 'Contexte et exposition aux risques'
  WHEN 4 THEN 'Contexte et exposition aux risques'
  WHEN 5 THEN 'Contexte et exposition aux risques'
  WHEN 6 THEN 'Contexte et exposition aux risques'
  WHEN 7 THEN 'Gouvernance et organisation'
  WHEN 8 THEN 'Gouvernance et organisation'
  WHEN 9 THEN 'Gouvernance et organisation'
  WHEN 10 THEN 'Gouvernance et organisation'
  WHEN 11 THEN 'Accès, mots de passe et réseau'
  WHEN 12 THEN 'Accès, mots de passe et réseau'
  WHEN 13 THEN 'Accès, mots de passe et réseau'
  WHEN 14 THEN 'Accès, mots de passe et réseau'
  WHEN 15 THEN 'Accès, mots de passe et réseau'
  WHEN 16 THEN 'Sensibilisation et sécurité humaine'
  WHEN 17 THEN 'Sensibilisation et sécurité humaine'
  WHEN 18 THEN 'Sensibilisation et sécurité humaine'
  WHEN 19 THEN 'Sensibilisation et sécurité humaine'
  WHEN 20 THEN 'Sauvegarde, incidents et conformité'
  WHEN 21 THEN 'Sauvegarde, incidents et conformité'
  WHEN 22 THEN 'Sauvegarde, incidents et conformité'
  WHEN 23 THEN 'Sauvegarde, incidents et conformité'
  WHEN 24 THEN 'Sauvegarde, incidents et conformité'
END,
question = CASE sort_order
  WHEN 10 THEN 'Réfléchissez-vous régulièrement aux risques informatiques qui menacent votre entreprise (virus, panne, vol de matériel) ?'
  WHEN 16 THEN 'Vos employés sont-ils informés des risques liés à internet et aux emails (virus, arnaques) ?'
  ELSE question
END
WHERE sort_order BETWEEN 1 AND 24;
