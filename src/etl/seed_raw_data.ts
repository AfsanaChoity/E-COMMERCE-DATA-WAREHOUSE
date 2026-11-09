import fs from 'fs';
import path from 'path';

/**
 * Ensures standard Olist raw CSV files exist in the specified raw data directory.
 * Preserves the exact Kaggle Olist Brazilian E-Commerce dataset schema.
 */
export function ensureRawOlistFiles(rawDir: string = '/data/raw'): string[] {
  // If /data/raw cannot be written or doesn't exist, fallback to ./data/raw in project
  let targetDir = rawDir;
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch {
    targetDir = path.resolve(process.cwd(), 'data', 'raw');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const generatedFiles: string[] = [];

  // 1. product_category_name_translation.csv
  const translationFile = path.join(targetDir, 'product_category_name_translation.csv');
  if (!fs.existsSync(translationFile)) {
    const content = `product_category_name,product_category_name_english
beleza_saude,health_beauty
informatica_acessorios,computers_accessories
cama_mesa_banho,bed_bath_table
esporte_lazer,sports_leisure
moveis_decoracao,furniture_decor
utilidades_domesticas,housewares
relogios_presentes,watches_gifts
telefonia,telephony
automotivo,auto
brinquedos,toys
cool_stuff,cool_stuff
ferramentas_jardim,garden_tools
perfumaria,perfumery
bebes,baby
eletronicos,electronics
papelaria,stationery
fashion_bolsas_e_acessorios,fashion_bags_accessories
pet_shop,pet_shop
malas_acessorios,luggage_accessories
consoles_games,consoles_games
construcao_ferramentas_construcao,construction_tools_construction
eletrodomesticos,home_appliances
audio,audio
alimentos_bebidas,food_drinks
livros_interesse_geral,books_general_interest
artes,art
climatizacao,air_conditioning
fashion_calcados,fashion_shoes
instrumentos_musicais,musical_instruments
artigos_de_festas,party_supplies`;
    fs.writeFileSync(translationFile, content.trim(), 'utf-8');
    generatedFiles.push(translationFile);
  }

  // 2. olist_geolocation_dataset.csv
  const geoFile = path.join(targetDir, 'olist_geolocation_dataset.csv');
  if (!fs.existsSync(geoFile)) {
    const content = `geolocation_zip_code_prefix,geolocation_lat,geolocation_lng,geolocation_city,geolocation_state
01001,-23.5498,-46.6340,sao paulo,SP
04538,-23.5832,-46.6789,sao paulo,SP
20010,-22.9068,-43.1729,rio de janeiro,RJ
22041,-22.9691,-43.1868,rio de janeiro,RJ
30110,-19.9245,-43.9352,belo horizonte,MG
80010,-25.4284,-49.2733,curitiba,PR
90010,-30.0346,-51.2177,porto alegre,RS
40010,-12.9714,-38.5014,salvador,BA
50010,-8.0476,-34.8770,recife,PE
70040,-15.7975,-47.8919,brasilia,DF
88010,-27.5954,-48.5480,florianopolis,SC
60010,-3.7319,-38.5267,fortaleza,CE
69005,-3.1190,-60.0217,manaus,AM
74003,-16.6869,-49.2648,goiania,GO
29010,-20.3155,-40.3128,vitoria,ES`;
    fs.writeFileSync(geoFile, content.trim(), 'utf-8');
    generatedFiles.push(geoFile);
  }

  // 3. olist_customers_dataset.csv
  const custFile = path.join(targetDir, 'olist_customers_dataset.csv');
  if (!fs.existsSync(custFile)) {
    const rows = [
      'customer_id,customer_unique_id,customer_zip_code_prefix,customer_city,customer_state',
      '06b8999e2fba1a1fbc88172c000cfafc,861eff4711a542e4b93843c6dd7febb0,14409,franca,SP',
      '18955e83d337fd6b2def6b18a428ac77,290c77bc529b7ac935b93aa66c333d04,09790,sao bernardo do campo,SP',
      '4e7b3e00288586ebd08712fdd0374a03,060e732b5b29e8181a18229c7b0b2b5e,01151,sao paulo,SP',
      'b2b0c3495d5c142831e04cb77f2cc5a6,259f7b5e6e4825740e50270c360932b8,13400,piracicaba,SP',
      '4f2d8ab171c80dd8318450c0bd738325,34513ce0c42474b535070eaa0b0f7672,13056,campinas,SP',
      '879864bdb9d961dd594c53725be1023a,4c93744516667ad3b8f1fb645a3114a4,89254,jaragua do sul,SC',
      'fd826e7cf63160e536e0908c76c3f441,addec96d2e0b6c824c5d690b8f888501,04534,sao paulo,SP',
      '5e274e7a27a6d19d51144b4b1e300d6f,57c2a7b0f1677e10150251dd00b38a22,28930,arraial do cabo,RJ',
      '56bb3a1d0a402e1608c07e3aa22384d2,9d4ecb661d054030c56df2fd4d00cb4b,31070,belo horizonte,MG',
      '3a504f8f431744c7b515d44757ca5689,0c6d864b49f1b1fe362637d6dd3f73ce,80010,curitiba,PR',
      '6a9f7d4e321544a8b71239c88722cc81,f3a216e927c73a38f381c6bb999c0df1,90010,porto alegre,RS',
      '8b2f17101239c8832a8291f09238e882,a123984bc87120198402934810238123,40010,salvador,BA',
      '9c30291f09238e882983109283410984,b9238401928341098230192834019284,70040,brasilia,DF',
      'e1982349018239048120394812039481,c8120394810293841029384019283401,50010,recife,PE',
      'f9182304918203948102938410293842,d9182039481029384102938401928341,88010,florianopolis,SC'
    ];
    fs.writeFileSync(custFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(custFile);
  }

  // 4. olist_sellers_dataset.csv
  const sellerFile = path.join(targetDir, 'olist_sellers_dataset.csv');
  if (!fs.existsSync(sellerFile)) {
    const rows = [
      'seller_id,seller_zip_code_prefix,seller_city,seller_state',
      '3442f8959a64dea5ee7249c5b04dd623,27277,volta redonda,RJ',
      'd1b65fc7debc3361ea86b5f14cba8697,06110,osasco,SP',
      'ce3ad9caf5b4745b2f306c4249024d06,30260,belo horizonte,MG',
      '1025f0e2d44d7041d6cf3018040d8342,13023,campinas,SP',
      '1f50f920176fa81dd9980b0474526dca,80010,curitiba,PR',
      '4a3ca9315b744ce9f8e9374361493884,14940,ibitinga,SP',
      'da8622b14eb17ae2831f4ac5b9dab84a,01001,sao paulo,SP',
      '2a348ef3a0f1d5f7b49468f28e001021,20010,rio de janeiro,RJ',
      'fa1c3138a4c7e0c56e2656c12e00e2e5,90010,porto alegre,RS',
      '7040e82f899a04d1b434b72445b2523f,40010,salvador,BA'
    ];
    fs.writeFileSync(sellerFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(sellerFile);
  }

  // 5. olist_products_dataset.csv
  const prodFile = path.join(targetDir, 'olist_products_dataset.csv');
  if (!fs.existsSync(prodFile)) {
    const rows = [
      'product_id,product_category_name,product_name_lenght,product_description_lenght,product_photos_qty,product_weight_g,product_length_cm,product_height_cm,product_width_cm',
      '1e9e8ef04dbcff4541ed26657ea517e5,perfumaria,40,287,1,225,16,10,14',
      '3aa071139cb16b67ca9e5dea641aaa2f,artes,44,276,1,1000,30,18,20',
      '96bd76ec8810374ed1b65e291975717f,esporte_lazer,46,250,1,154,18,9,15',
      'cef67bcfe19e6684017c2250849b0206,bebes,27,261,1,371,26,4,26',
      '09ff539a621711667c43257429864be7,utilidades_domesticas,60,402,2,625,20,17,13',
      '428efac0adeb054b71526f84a0d9f538,cama_mesa_banho,59,492,3,675,22,12,18',
      'b43f03037968f11795eb46b749352814,beleza_saude,58,1002,4,450,19,14,14',
      '38d3195dd0073d1c3143abb747bd6590,informatica_acessorios,55,750,2,800,25,15,20',
      '53b36df67ebb7c41585e8d54d6772e08,relogios_presentes,52,550,2,320,18,12,14',
      '87285b34884572807f717429e8b11401,telefonia,48,620,1,280,17,8,12',
      'e0d6425236b920840399d553915076ac,automotivo,51,890,3,1500,35,20,25',
      '06c6e0118629f991c6f3c5000f400076,brinquedos,57,430,2,550,22,15,18',
      'a62e25e03e05e7909135f29bd2176394,cool_stuff,49,380,1,410,16,10,15',
      '11250b0d9b704ec477d8e1d3eec7165d,moveis_decoracao,54,720,2,3200,45,30,30',
      '7c1bd920ce5ecd036532dd8badc5c545,ferramentas_jardim,53,610,1,1200,28,18,22'
    ];
    fs.writeFileSync(prodFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(prodFile);
  }

  // 6. olist_orders_dataset.csv
  const ordersFile = path.join(targetDir, 'olist_orders_dataset.csv');
  if (!fs.existsSync(ordersFile)) {
    const rows = [
      'order_id,customer_id,order_status,order_purchase_timestamp,order_approved_at,order_delivered_carrier_date,order_delivered_customer_date,order_estimated_delivery_date',
      'e481f51cbdc54678b7cc49136f2d6af7,9ef432eb6251297304e76186b10a928d,delivered,2017-10-02 10:56:33,2017-10-02 11:07:15,2017-10-04 19:55:00,2017-10-10 21:25:13,2017-10-18 00:00:00',
      '53cdb2fc8bc7dce0b6741e2150273451,b0830fb4747a6c6d20dea0b8c802d7ef,delivered,2018-07-24 20:41:37,2018-07-26 03:24:27,2018-07-26 14:31:00,2018-08-07 15:27:45,2018-08-13 00:00:00',
      '47770eb9100c2d0c44946d9cf07ec65d,41ce2a54c0b03bf3443c3d931a367089,delivered,2018-08-08 08:38:49,2018-08-08 08:55:23,2018-08-08 13:50:00,2018-08-17 18:06:29,2018-09-04 00:00:00',
      '949d5b44dbf5de918fe9c16f97b45f8a,f88197465ea7920adcdbec7375364d82,delivered,2017-11-18 19:28:06,2017-11-18 19:45:59,2017-11-22 13:39:59,2017-12-02 00:28:42,2017-12-15 00:00:00',
      'ad0353ab4b007d043297f222657947b8,8ab97904e6daea8866dbdbc4fb7aad2c,delivered,2018-02-13 21:18:39,2018-02-13 22:20:29,2018-02-14 19:46:34,2018-02-16 18:17:02,2018-02-26 00:00:00',
      'a4591c265e18cb1dcee528d65ca31ab3,503740e9ca751ccdda7ba28e9ab8f608,delivered,2017-07-09 21:57:05,2017-07-09 22:10:13,2017-07-11 14:58:04,2017-07-26 10:57:55,2017-08-01 00:00:00',
      '136cce7faa429382030f9d8d661660e6,ed0271e0b7da060a393796590e7b737a,delivered,2017-04-13 16:35:17,2017-04-13 17:05:19,2017-04-17 16:35:48,2017-05-09 18:04:26,2017-05-09 00:00:00',
      '6514b8ad8028c9f2cc2374ded245783f,9bcdf6fb0b625875614234444018785b,delivered,2017-05-16 13:10:30,2017-05-16 13:22:11,2017-05-22 10:07:46,2017-05-26 12:55:51,2017-06-07 00:00:00',
      '763751e47994ab44102911d2d4329914,9ef432eb6251297304e76186b10a928d,delivered,2018-03-23 12:12:12,2018-03-23 12:30:15,2018-03-25 15:40:00,2018-03-30 19:10:00,2018-04-15 00:00:00',
      '872b1239109471203948120394810239,06b8999e2fba1a1fbc88172c000cfafc,delivered,2018-05-10 14:20:00,2018-05-10 14:35:00,2018-05-12 11:20:00,2018-05-18 16:40:00,2018-05-30 00:00:00',
      '23094812039481029384019283401928,18955e83d337fd6b2def6b18a428ac77,shipped,2018-06-15 09:12:00,2018-06-15 09:30:00,2018-06-17 13:10:00,,2018-07-02 00:00:00',
      '98120394810293840192834019283401,4e7b3e00288586ebd08712fdd0374a03,delivered,2018-06-22 17:40:00,2018-06-22 18:00:00,2018-06-24 10:15:00,2018-07-01 14:20:00,2018-07-15 00:00:00',
      '19283401928340192834019283401928,b2b0c3495d5c142831e04cb77f2cc5a6,delivered,2018-07-05 11:05:00,2018-07-05 11:25:00,2018-07-07 14:00:00,2018-07-12 16:30:00,2018-07-28 00:00:00',
      '50192834019283401928340192834019,4f2d8ab171c80dd8318450c0bd738325,delivered,2018-08-01 16:20:00,2018-08-01 16:45:00,2018-08-03 09:30:00,2018-08-09 13:40:00,2018-08-25 00:00:00',
      '60192834019283401928340192834020,879864bdb9d961dd594c53725be1023a,invoiced,2018-08-15 13:10:00,2018-08-15 13:35:00,,,2018-09-01 00:00:00'
    ];
    fs.writeFileSync(ordersFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(ordersFile);
  }

  // 7. olist_order_items_dataset.csv
  const itemsFile = path.join(targetDir, 'olist_order_items_dataset.csv');
  if (!fs.existsSync(itemsFile)) {
    const rows = [
      'order_id,order_item_id,product_id,seller_id,shipping_limit_date,price,freight_value',
      'e481f51cbdc54678b7cc49136f2d6af7,1,87285b34884572807f717429e8b11401,3442f8959a64dea5ee7249c5b04dd623,2017-10-06 11:07:15,29.99,8.72',
      '53cdb2fc8bc7dce0b6741e2150273451,1,53b36df67ebb7c41585e8d54d6772e08,d1b65fc7debc3361ea86b5f14cba8697,2018-07-30 03:24:27,118.70,22.76',
      '47770eb9100c2d0c44946d9cf07ec65d,1,428efac0adeb054b71526f84a0d9f538,ce3ad9caf5b4745b2f306c4249024d06,2018-08-13 08:55:23,159.90,19.22',
      '949d5b44dbf5de918fe9c16f97b45f8a,1,b43f03037968f11795eb46b749352814,1025f0e2d44d7041d6cf3018040d8342,2017-11-23 19:45:59,45.00,27.20',
      'ad0353ab4b007d043297f222657947b8,1,38d3195dd0073d1c3143abb747bd6590,1f50f920176fa81dd9980b0474526dca,2018-02-19 20:31:37,19.90,8.72',
      'a4591c265e18cb1dcee528d65ca31ab3,1,06c6e0118629f991c6f3c5000f400076,4a3ca9315b744ce9f8e9374361493884,2017-07-13 22:10:13,147.90,27.36',
      '136cce7faa429382030f9d8d661660e6,1,e0d6425236b920840399d553915076ac,da8622b14eb17ae2831f4ac5b9dab84a,2017-04-19 17:05:19,69.00,17.22',
      '6514b8ad8028c9f2cc2374ded245783f,1,09ff539a621711667c43257429864be7,2a348ef3a0f1d5f7b49468f28e001021,2017-05-22 13:22:11,59.99,15.17',
      '763751e47994ab44102911d2d4329914,1,b43f03037968f11795eb46b749352814,fa1c3138a4c7e0c56e2656c12e00e2e5,2018-03-29 12:30:15,89.90,16.05',
      '872b1239109471203948120394810239,1,1e9e8ef04dbcff4541ed26657ea517e5,7040e82f899a04d1b434b72445b2523f,2018-05-16 14:35:00,109.90,14.50',
      '23094812039481029384019283401928,1,11250b0d9b704ec477d8e1d3eec7165d,4a3ca9315b744ce9f8e9374361493884,2018-06-21 09:30:00,249.00,35.20',
      '98120394810293840192834019283401,1,38d3195dd0073d1c3143abb747bd6590,1f50f920176fa81dd9980b0474526dca,2018-06-28 18:00:00,399.00,28.40',
      '19283401928340192834019283401928,1,53b36df67ebb7c41585e8d54d6772e08,d1b65fc7debc3361ea86b5f14cba8697,2018-07-11 11:25:00,189.90,21.50',
      '50192834019283401928340192834019,1,7c1bd920ce5ecd036532dd8badc5c545,da8622b14eb17ae2831f4ac5b9dab84a,2018-08-07 16:45:00,85.50,18.00',
      '60192834019283401928340192834020,1,a62e25e03e05e7909135f29bd2176394,ce3ad9caf5b4745b2f306c4249024d06,2018-08-21 13:35:00,129.00,16.80'
    ];
    fs.writeFileSync(itemsFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(itemsFile);
  }

  // 8. olist_order_payments_dataset.csv
  const paymentsFile = path.join(targetDir, 'olist_order_payments_dataset.csv');
  if (!fs.existsSync(paymentsFile)) {
    const rows = [
      'order_id,payment_sequential,payment_type,payment_installments,payment_value',
      'e481f51cbdc54678b7cc49136f2d6af7,1,credit_card,1,18.12',
      'e481f51cbdc54678b7cc49136f2d6af7,2,voucher,1,2.00',
      'e481f51cbdc54678b7cc49136f2d6af7,3,voucher,1,18.59',
      '53cdb2fc8bc7dce0b6741e2150273451,1,boleto,1,141.46',
      '47770eb9100c2d0c44946d9cf07ec65d,1,credit_card,3,179.12',
      '949d5b44dbf5de918fe9c16f97b45f8a,1,credit_card,1,72.20',
      'ad0353ab4b007d043297f222657947b8,1,credit_card,1,28.62',
      'a4591c265e18cb1dcee528d65ca31ab3,1,credit_card,6,175.26',
      '136cce7faa429382030f9d8d661660e6,1,credit_card,1,86.22',
      '6514b8ad8028c9f2cc2374ded245783f,1,credit_card,1,75.16',
      '763751e47994ab44102911d2d4329914,1,credit_card,2,105.95',
      '872b1239109471203948120394810239,1,credit_card,4,124.40',
      '23094812039481029384019283401928,1,credit_card,8,284.20',
      '98120394810293840192834019283401,1,credit_card,10,427.40',
      '19283401928340192834019283401928,1,boleto,1,211.40',
      '50192834019283401928340192834019,1,credit_card,3,103.50',
      '60192834019283401928340192834020,1,debit_card,1,145.80'
    ];
    fs.writeFileSync(paymentsFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(paymentsFile);
  }

  // 9. olist_order_reviews_dataset.csv
  const reviewsFile = path.join(targetDir, 'olist_order_reviews_dataset.csv');
  if (!fs.existsSync(reviewsFile)) {
    const rows = [
      'review_id,order_id,review_score,review_comment_title,review_comment_message,review_creation_date,review_answer_timestamp',
      '7bc24e225da240e37c63b9a0204966ac,e481f51cbdc54678b7cc49136f2d6af7,4,,Atendimento rápido e produto de boa qualidade.,2017-10-11 00:00:00,2017-10-12 03:43:48',
      'e07265c28040f9636cd0f377fa7576c5,53cdb2fc8bc7dce0b6741e2150273451,5,,Muito bom produto recomendo a todos!,2018-08-08 00:00:00,2018-08-08 18:37:50',
      'f3a47553160a12d30ac10c800c746fce,47770eb9100c2d0c44946d9cf07ec65d,5,,Excelente entrega antes do prazo previsto!,2018-08-18 00:00:00,2018-08-22 19:07:58',
      '2a424e1e83e0f0760d66d192d721907d,949d5b44dbf5de918fe9c16f97b45f8a,5,,Otimo produto chegou super bem embalado,2017-12-03 00:00:00,2017-12-05 19:21:58',
      'd28c018f21e073998f4802c34918e7c1,ad0353ab4b007d043297f222657947b8,4,,Chegou tudo certo,2018-02-17 00:00:00,2018-02-18 13:02:11',
      'c7104928190384710928340192834019,a4591c265e18cb1dcee528d65ca31ab3,5,,Adorei o brinquedo meu filho amou!,2017-07-27 00:00:00,2017-07-28 10:11:00',
      'b8192039481029384019283401928340,136cce7faa429382030f9d8d661660e6,3,,Demorou um pouco mas foi entregue,2017-05-10 00:00:00,2017-05-11 14:22:00',
      'a9182304918203948102938401928341,6514b8ad8028c9f2cc2374ded245783f,5,,Super recomendo a loja,2017-05-27 00:00:00,2017-05-28 09:00:00',
      '98120394810293840192834019283402,763751e47994ab44102911d2d4329914,4,,Produto bonito e funcional,2018-03-31 00:00:00,2018-04-01 11:20:00',
      '87120394810293840192834019283403,872b1239109471203948120394810239,5,,Perfume original muito cheiroso!,2018-05-19 00:00:00,2018-05-20 15:40:00',
      '76120394810293840192834019283404,23094812039481029384019283401928,4,,Movel resistente e facil de montar,2018-06-25 00:00:00,2018-06-26 12:10:00',
      '65120394810293840192834019283405,98120394810293840192834019283401,5,,Excelente qualidade de construcao,2018-07-02 00:00:00,2018-07-03 14:00:00',
      '54120394810293840192834019283406,19283401928340192834019283401928,5,,Relogio muito bonito e elegante,2018-07-13 00:00:00,2018-07-14 16:30:00',
      '43120394810293840192834019283407,50192834019283401928340192834019,4,,Ferramenta util para o jardim,2018-08-10 00:00:00,2018-08-11 11:15:00',
      '32120394810293840192834019283408,60192834019283401928340192834020,5,,Entrega no prazo certinho,2018-08-20 00:00:00,2018-08-21 17:50:00'
    ];
    fs.writeFileSync(reviewsFile, rows.join('\n'), 'utf-8');
    generatedFiles.push(reviewsFile);
  }

  return generatedFiles;
}
