-- Rollback 338: remove additive directory sources (keep original 327 six).
-- Does not revert edomex needs_login (safe to leave true).

DELETE FROM ciceron.bulletin_sources
WHERE source_key IN (
  'coah_listas_pjecz','tab_lista_acuerdos','son_lista_acuerdos','mich_lista_acuerdos',
  'ver_listas','slp_acuerdos','bcs_acceso_libre','gro_listas','ags_temisoral',
  'cam_sigelex','nay_boletin_publico','mor_boletin','dgo_listas_tsj','chih_listas_stj',
  'yuc_lista_acuerdos','hgo_publicaciones','bc_boletin_pj','pue_acuerdos','qroo_tsj',
  'tam_acceso_libre','sin_boletin','zac_consulta_acuerdos','col_listas_stj',
  'tlax_notifica','chis_listas','oax_tribunal'
);
