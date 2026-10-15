# Nguồn chân dung La bàn Tư tưởng

Kiểm tra ngày 07/10/2026. Bổ sung 126/140 chân dung còn thiếu, đưa tổng số lên 407/421; 14 hồ sơ còn chờ ảnh phù hợp. Giữ nguyên 281 mục metadata và 562 file AVIF đã có.

## Định dạng và nguồn

Mỗi chân dung có hai file AVIF đơn sắc, tỷ lệ 4:5: 160×200 và 400×500. Metadata trong `src/data/quiz/portraits.json` giữ cấu trúc trang đang đọc: `src`, `width`, `height`, `credit`, `license`, `page`. `page` dẫn đến trang file Commons chứa tác giả, nguồn gốc và điều kiện sử dụng.

[portrait-sources.json](./portrait-sources.json) lưu nguồn ảnh gốc, liên kết giấy phép nếu Commons cung cấp, dòng ghi công yêu cầu, ngày kiểm, phiên bản trang nguồn, vùng crop và ghi chú cho từng ảnh mới. Bản AVIF là bản chuyển đổi từ ảnh nguồn; điều kiện của giấy phép ghi trong từng mục tiếp tục áp dụng, gồm ShareAlike khi có. Không áp dụng một giấy phép chung thay cho các giấy phép nguồn.

Lượt chọn ảnh kiểm danh tính và nội dung ảnh, không lấy P18 một cách máy móc. Đã loại đồng xu có đầu Zeus được gán cho Dion, thư pháp tên người, bia mộ, quảng cáo không có mặt người và người trùng tên. Hai file mặc định của Milošević và Castro đang có đề nghị xóa vì vấn đề quyền sử dụng đã được thay bằng ảnh nguồn USAF và Library of Congress.

Etzioni được cắt từ ảnh nhóm ở trang 3 bản tin RIT News & Events ngày 14/04/1983; chú thích xác định ông là người bên trái. Cole được cắt từ tranh nhóm của F. H. S. Shepherd; chú thích xác định ông là người thứ tư từ trái sang hàng trên. Tranh Cole có độ chi tiết hạn chế. Với người cổ đại, tượng và tranh hậu thế được ghi rõ trong manifest; không diễn giải thành hình ảnh đương thời.

## Chân dung bổ sung

| Nhân vật | Mã | Nguồn Commons | Credit | Giấy phép |
| --- | --- | --- | --- | --- |
| Derrick Jensen | derrick-jensen | [File](https://commons.wikimedia.org/wiki/File:Derrick_Jensen,_2020_(cropped).png) | Escape with Lord Hugh R. Adumbass | CC BY 3.0 |
| Salah al-Din al-Bitar | salah-al-din-al-bitar | [File](https://commons.wikimedia.org/wiki/File:Prime_Minister_Salah_al-Bitar_-_March_1963.png) | Unknown, published by the Syrian History Archive | Public domain |
| Saddam Hussein | saddam-hussein | [File](https://commons.wikimedia.org/wiki/File:Saddam_Hussein_at_trial,_July_2004.JPEG) | Không rõ tác giả | Public domain |
| Hafez al-Assad | hafez-al-assad | [File](https://commons.wikimedia.org/wiki/File:Hafez_al-Assad_official_portrait.jpg) | Government of Syria | Public domain |
| Subandrio | subandrio | [File](https://commons.wikimedia.org/wiki/File:Subandrio_1963.jpg) | Không rõ tác giả ảnh gốc; nguồn đăng: Davidelit (English Wikipedia) | Public domain |
| Roeslan Abdulgani | roeslan-abdulgani | [File](https://commons.wikimedia.org/wiki/File:Roeslan_Abdulgani,_Kami_Perkenalkan_(1954),_p37.jpg) | Ministry of Information of Indonesia | Public domain |
| Ngô Đình Nhu | ngo-dinh-nhu | [File](https://commons.wikimedia.org/wiki/File:Portrait_photograph_of_Ngo_Dinh_Nhu.jpg) | CIA | Public domain |
| Alberto Fujimori | alberto-fujimori | [File](https://commons.wikimedia.org/wiki/File:Alberto_Fujimori_en_1991.jpg) | Christian Lambiotte / European Communities, 1991 / © European Union, 2026 | CC BY 4.0 |
| Slobodan Milošević | slobodan-milosevic | [File](https://commons.wikimedia.org/wiki/File:Slobodan_Milo%C5%A1evi%C4%87_1995a.jpg) | U.S. Air Force/Staff Sgt. Brian Schlumbohm | Public domain |
| Robert Mugabe | robert-mugabe | [File](https://commons.wikimedia.org/wiki/File:Robert_Mugabe_Official_Portrait.jpg) | Government of Zimbabwe, taken by Joseph Nyadzayo as Presidential Photographer | Public domain |
| Rafael Trujillo | rafael-trujillo | [File](https://commons.wikimedia.org/wiki/File:Rafael_L._Trujillo_en_la_silla_presidencial_(cropped).jpg) | Unknown author. | Public domain |
| Mobutu Sese Seko | mobutu-sese-seko | [File](https://commons.wikimedia.org/wiki/File:Mobutu.jpg) | Frank Hall | Public domain |
| Ferdinand Marcos | ferdinand-marcos | [File](https://commons.wikimedia.org/wiki/File:Ferdinand_Marcos_(cropped).jpg) | Spec. 4 Dino Bartomucci; bản cắt: Bluemask | CC BY-SA 3.0 |
| Marcello Caetano | marcello-caetano | [File](https://commons.wikimedia.org/wiki/File:Marcello_caetano.jpg) | http://www.uned.es | CC BY 2.5 |
| Kurt Schuschnigg | kurt-schuschnigg | [File](https://commons.wikimedia.org/wiki/File:KurtVonSchuschnigg1936-3.jpg) | Không rõ tác giả ảnh gốc; bản cắt: Mario Link | Copyrighted free use |
| Getúlio Vargas | getulio-vargas | [File](https://commons.wikimedia.org/wiki/File:Getulio_Vargas_(1930).jpg) | Governo do Brasil | Public domain |
| Amitai Etzioni | amitai-etzioni | [File](https://commons.wikimedia.org/wiki/File:RIT_NandE_Vol14Num49_1983_Apr14_Complete.pdf) | Không rõ nhiếp ảnh gia; Rochester Institute of Technology, News & Events (14/04/1983), tr. 3 | Public domain |
| Michael Sandel | michael-sandel | [File](https://commons.wikimedia.org/wiki/File:2023-08-07_Michael_Sandel_no_Fronteiras_do_Pensamento_2023_em_S%C3%A3o_Paulo_(53103759044)_(cropped).jpg) | Fronteiras do Pensamento | CC BY-SA 2.0 |
| Alasdair MacIntyre | alasdair-macintyre | [File](https://commons.wikimedia.org/wiki/File:Alasdair_MacIntyre.jpg) | Sean O'Connor | CC BY 2.0 |
| Platon | plato | [File](https://commons.wikimedia.org/wiki/File:Plato_Silanion_Musei_Capitolini_MC1377.jpg) | © Marie-Lan Nguyen / Wikimedia Commons | CC BY 2.5 |
| Dion xứ Syracuse | dion-of-syracuse | [File](https://commons.wikimedia.org/wiki/File:Dione_Siracusano.PNG) | Domenico Lo Faso Pietrasanta | Public domain |
| Al-Farabi | al-farabi | [File](https://commons.wikimedia.org/wiki/File:Farabi.jpg) | Iraninhk | CC BY-SA 4.0 |
| Zeno xứ Citium | zeno-of-citium | [File](https://commons.wikimedia.org/wiki/File:Paolo_Monti_-_Servizio_fotografico_(Napoli,_1969)_-_BEIC_6353768.jpg) | Paolo Monti | CC BY-SA 4.0 |
| Seneca | seneca-the-younger | [File](https://commons.wikimedia.org/wiki/File:Duble_herma_of_Socrates_and_Seneca_Antikensammlung_Berlin_07.jpg) | Calidius | CC BY-SA 3.0 |
| Marcus Aurelius | marcus-aurelius | [File](https://commons.wikimedia.org/wiki/File:Marcus_Aurelius_Louvre_MR561_n02.jpg) | Marie-Lan Nguyen | CC BY 2.5 |
| Thomas Hobbes | thomas-hobbes | [File](https://commons.wikimedia.org/wiki/File:Thomas_Hobbes_(portrait).jpg) | John Michael Wright | Public domain |
| Jean Bodin | jean-bodin | [File](https://commons.wikimedia.org/wiki/File:Jean_Bodin.jpg) | François Stuerhelt | Public domain |
| G. W. F. Hegel | g-w-f-hegel | [File](https://commons.wikimedia.org/wiki/File:Jakob_Schlesinger_-_Hegel_1831.jpg) | Jakob Schlesinger | Public domain |
| Lorenz von Stein | lorenz-von-stein | [File](https://commons.wikimedia.org/wiki/File:Lorenz_von_Stein.jpg) | Không rõ tác giả | Public domain |
| Itō Hirobumi | ito-hirobumi | [File](https://commons.wikimedia.org/wiki/File:IT%C5%8C_Hirobumi.jpg) | Không rõ tác giả | Public domain |
| Jeremy Bentham | jeremy-bentham | [File](https://commons.wikimedia.org/wiki/File:Jeremy_Bentham_by_Henry_William_Pickersgill_detail.jpg) | Henry William Pickersgill | Public domain |
| James Mill | james-mill | [File](https://commons.wikimedia.org/wiki/File:James_Mill.jpg) | Không rõ tác giả | Public domain |
| Edwin Chadwick | edwin-chadwick | [File](https://commons.wikimedia.org/wiki/File:SirEdwinChadwick.jpg) | Contemporary photograph | Public domain |
| Herman Gorter | herman-gorter | [File](https://commons.wikimedia.org/wiki/File:Portret_van_Herman_Gorter.jpg) | Unknown author , probably Thérèse Schwartze. | Public domain |
| Otto Rühle | otto-ruhle | [File](https://commons.wikimedia.org/wiki/File:Otto_R%C3%BChle_1930.jpg) | Không rõ tác giả | Public domain |
| Paul Mattick | paul-mattick | [File](https://commons.wikimedia.org/wiki/File:PaulMattick.jpg) | Không rõ tác giả | CC0 |
| Mehmet Shehu | mehmet-shehu | [File](https://commons.wikimedia.org/wiki/File:Mehmet_Shehu_(ushtarak).jpg) | Không rõ tác giả | Public domain |
| Ramiz Alia | ramiz-alia | [File](https://commons.wikimedia.org/wiki/File:Ramiz_Alia_(portret).jpg) | Albanian State | Public domain |
| Che Guevara | che-guevara | [File](https://commons.wikimedia.org/wiki/File:Che_Guevara_-_Guerrillero_Heroico_by_Alberto_Korda.jpg) | Alberto Korda, restored by Adam Cuerden | Public domain |
| Fidel Castro | fidel-castro | [File](https://commons.wikimedia.org/wiki/File:Fidel_Castro_-_UN_General_Assembly_1960_(cropped).jpg) | Warren K. Leffler | Public domain |
| Carlos Fonseca | carlos-fonseca | [File](https://commons.wikimedia.org/wiki/File:Carlos_Fonseca_Amador_(1970).jpg) | C records | CC BY-SA 4.0 |
| Pol Pot | pol-pot | [File](https://commons.wikimedia.org/wiki/File:Pol_Pot_(cropped).jpg) | Không rõ tác giả | Attribution |
| Nuon Chea | nuon-chea | [File](https://commons.wikimedia.org/wiki/File:Nuon_Chea_on_31_October_2013.jpg) | Mark Peters / Extraordinary Chambers in the Courts of Cambodia (ECCC) | CC BY 2.0 |
| Ieng Sary | ieng-sary | [File](https://commons.wikimedia.org/wiki/File:Mak_Remissa-IS01.jpg) | ECCC Pool/Mak Remissa | CC BY 2.0 |
| Wilhelm I | wilhelm-i | [File](https://commons.wikimedia.org/wiki/File:Kaiser_Wilhelm_I._.JPG) | Wilhelm Kuntzemüller | Public domain |
| Hermann Wagener | hermann-wagener | [File](https://commons.wikimedia.org/wiki/File:Hermann_Wagener.png) | Không rõ tác giả | Public domain |
| Adolph Wagner | adolph-wagner | [File](https://commons.wikimedia.org/wiki/File:Adolph_Wagner.png) | Không rõ tác giả | Public domain |
| Phillip Blond | phillip-blond | [File](https://commons.wikimedia.org/wiki/File:Phillip_Blond,_2018.jpg) | Rwendland | CC BY-SA 4.0 |
| John Milbank | john-milbank | [File](https://commons.wikimedia.org/wiki/File:John_Milbank,_IEIS_conference_%C2%ABThe_Politics_of_Virtue,_the_crisis_of_liberalism_and_the_post-liberal_future%C2%BB-004.jpg) | Jwh (Wikipedia Luxembourg) | CC BY-SA 3.0 lu |
| G. D. H. Cole | g-d-h-cole | [File](https://commons.wikimedia.org/wiki/File:F._H._S._Shepherd,_University_College_Fellows.jpg) | F. H. S. Shepherd | Public domain |
| R. H. Tawney | r-h-tawney | [File](https://commons.wikimedia.org/wiki/File:R._H._Tawney.png) | Library of the London School of Economics and Political Science; bản cắt: nagualdesign | No restrictions |
| Keir Hardie | keir-hardie | [File](https://commons.wikimedia.org/wiki/File:Keir_Hardie_by_George_Grantham_Bain.jpg) | George Grantham Bain / Adam Cuerden | Public domain |
| F. D. Maurice | f-d-maurice | [File](https://commons.wikimedia.org/wiki/File:Frederick_Denison_Maurice._Portrait_c1865.jpg) | Acabashi | CC BY 3.0 |
| Mặc Tử | mozi | [File](https://commons.wikimedia.org/wiki/File:%D0%A4%D0%B8%D0%BB%D0%BE%D1%81%D0%BE%D1%84_%D0%9C%D0%BE-%D0%A6%D0%B7%D1%8B.jpg) | Vjacheslav Rublevskiy | CC0 |
| Tuân Tử | xunzi | [File](https://commons.wikimedia.org/wiki/File:Portrait_of_Xun_Zi.jpg) | Không rõ tác giả | Public domain |
| Giả Nghị | jia-yi | [File](https://commons.wikimedia.org/wiki/File:Jia_Yi.png) | Không rõ tác giả | Public domain |
| Ogyū Sorai | ogyu-sorai | [File](https://commons.wikimedia.org/wiki/File:Ogyuh_Sorai.jpg) | 有朋堂書店 | Public domain |
| Kautilya (Chanakya) | chanakya | [File](https://commons.wikimedia.org/wiki/File:Chanakya_artistic_depiction.jpg) | Không rõ tác giả | Public domain |
| Chandragupta Maurya | chandragupta-maurya | [File](https://commons.wikimedia.org/wiki/File:Chandragupt_maurya_Birla_mandir_6_dec_2009_(31)_(cropped).JPG) | आशीष भटनागर at Hindi Wikipedia | Public domain |
| Raúl Prebisch | raul-prebisch | [File](https://commons.wikimedia.org/wiki/File:Raul_Prebisch_(cropped).tif) | Không rõ tác giả | Public domain |
| Celso Furtado | celso-furtado | [File](https://commons.wikimedia.org/wiki/File:Celso_Furtado.tif) | Không rõ tác giả | Public domain |
| Juscelino Kubitschek | juscelino-kubitschek | [File](https://commons.wikimedia.org/wiki/File:Juscelino_Kubitschek_in_1956.jpg) | Governo do Brasil | Public domain |
| Kita Ikki | ikki-kita | [File](https://commons.wikimedia.org/wiki/File:Kita_Ikki.jpg) | Không rõ tác giả | Public domain |
| José Antonio Primo de Rivera | jose-antonio-primo-de-rivera | [File](https://commons.wikimedia.org/wiki/File:FOTOGRAFIA_DE_JOSE_ANTONIO_PRIMO_DE_RIVERA.jpg) | Không rõ tác giả | CC0 |
| Ramiro Ledesma Ramos | ramiro-ledesma-ramos | [File](https://commons.wikimedia.org/wiki/File:Ramiro_Ledesma_(circa_1930).jpg) | Không rõ tác giả | Public domain |
| Francisco Rolão Preto | francisco-rolao-preto | [File](https://commons.wikimedia.org/wiki/File:Francisco_Rol%C3%A3o_Preto_in_blueshirt_uniform.jpg) | Mário Novais | Public domain |
| Mary Wollstonecraft | mary-wollstonecraft | [File](https://commons.wikimedia.org/wiki/File:Mary_Wollstonecraft_by_John_Opie_(c._1797).jpg) | John Opie | Public domain |
| Elizabeth Cady Stanton | elizabeth-cady-stanton | [File](https://commons.wikimedia.org/wiki/File:Elizabeth_Stanton.jpg) | Không rõ tác giả | Public domain |
| Betty Friedan | betty-friedan | [File](https://commons.wikimedia.org/wiki/File:Betty_Friedan_1960.jpg) | Fred Palumbo , World Telegram staff photographer. Restored by Adam Cuerden | Public domain |
| Clara Zetkin | clara-zetkin | [File](https://commons.wikimedia.org/wiki/File:C_Zetkin_1.jpg) | Không rõ tác giả | Public domain |
| Alexandra Kollontai | alexandra-kollontai | [File](https://commons.wikimedia.org/wiki/File:Alexandra_Kollontai_1946.jpg) | Unknown (Sovfoto) | Public domain |
| Silvia Federici | silvia-federici | [File](https://commons.wikimedia.org/wiki/File:La_escritora_y_activista_feminista_Silvia_Federici_(cropped).jpg) | Marta Jara ( eldiario.es ) | CC BY-SA 3.0 es |
| Kate Millett | kate-millett | [File](https://commons.wikimedia.org/wiki/File:Kate_millet_1.jpg) | Linda Wolf | CC BY-SA 3.0 |
| Andrea Dworkin | andrea-dworkin | [File](https://commons.wikimedia.org/wiki/File:Andrea_Dworkin_1985_(facecrop).jpg) | MaryMotleyKalergisPhotography | CC BY-SA 4.0 |
| Alexis de Tocqueville | alexis-de-tocqueville | [File](https://commons.wikimedia.org/wiki/File:Alexis_de_Tocqueville_(Th%C3%A9odore_Chass%C3%A9riau_-_Versailles).jpg) | Théodore Chassériau | Public domain |
| François Guizot | francois-guizot | [File](https://commons.wikimedia.org/wiki/File:Fran%C3%A7ois_Pierre_Guillaume_Guizot.jpg) | Không rõ tác giả | Public domain |
| José Ortega y Gasset | jose-ortega-y-gasset | [File](https://commons.wikimedia.org/wiki/File:Jos%C3%A9_Ortega_y_Gasset_(cropped).jpg) | SAS Scandinavian Airlines | Public domain |
| Léon Bourgeois | leon-bourgeois | [File](https://commons.wikimedia.org/wiki/File:L%C3%A9on_Bourgeois.jpg) | Unknown (Bain News Service, publisher) | Public domain |
| Émile Combes | emile-combes | [File](https://commons.wikimedia.org/wiki/File:%C3%89mile_Combes.jpg) | Unknown (Bain News Service, publisher) | Public domain |
| Édouard Herriot | edouard-herriot | [File](https://commons.wikimedia.org/wiki/File:%C3%89douard_Herriot_-_Pr%C3%A9sident_du_Conseil_-_1924.jpeg) | Agence de presse Meurisse | Public domain |
| Thomas Paine | thomas-paine | [File](https://commons.wikimedia.org/wiki/File:Thomas_Paine_rev1.jpg) | Auguste Millière, theo George Romney và William Sharp | Public domain |
| Philippe Van Parijs | philippe-van-parijs | [File](https://commons.wikimedia.org/wiki/File:Philippe_Van_Parijs_(cropped).jpg) | Revenu de base from France | CC BY 2.0 |
| Oskar Lange | oskar-lange | [File](https://commons.wikimedia.org/wiki/File:Oskar_Lange_20-65.jpg) | Władysław Miernicki | Public domain |
| Tomáš Masaryk | tomas-masaryk | [File](https://commons.wikimedia.org/wiki/File:Tom%C3%A1%C5%A1_Garrigue_Masaryk_1925.PNG) | Không rõ tác giả | Public domain |
| Mustafa Kemal Atatürk | mustafa-kemal-ataturk | [File](https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_Kemal.jpg) | Không rõ tác giả | Public domain |
| İsmet İnönü | ismet-inonu | [File](https://commons.wikimedia.org/wiki/File:Inonu_Ismet_(cropped).jpg) | Unknown. Official photo of President. | Public domain |
| Habib Bourguiba | habib-bourguiba | [File](https://commons.wikimedia.org/wiki/File:Habib_Bourguiba_portrait4.jpg) | Habib Osman | Public domain |
| David Ben-Gurion | david-ben-gurion | [File](https://commons.wikimedia.org/wiki/File:David_Ben-Gurion_(D597-087).jpg) | Fritz Cohen | Public domain |
| Berl Katznelson | berl-katznelson | [File](https://commons.wikimedia.org/wiki/File:PORTRAIT_OF_THE_LABOUR_LEADER_BERL_KATZENELSON._%D7%A4%D7%95%D7%A8%D7%98%D7%A8%D7%98_%D7%A9%D7%9C_%D7%91%D7%A8%D7%9C_%D7%9B%D7%A6%D7%A0%D7%9C%D7%A1%D7%95%D7%9F.D836-117_(cropped).jpg) | Zoltan Kluger | Public domain |
| Golda Meir | golda-meir | [File](https://commons.wikimedia.org/wiki/File:Golda_Meir_03265u-2_(cropped).jpg) | Talmoryair ( talk ) after Marion S. Trikosko | Public domain |
| Ze'ev Jabotinsky | zeev-jabotinsky | [File](https://commons.wikimedia.org/wiki/File:Zeev_Jabotinsky_portrait.png) | Không rõ tác giả | Public domain |
| Menachem Begin | menachem-begin | [File](https://commons.wikimedia.org/wiki/File:Menachem_Begin,_Andrews_AFB,_1978.JPG) | USAF personnel; bản cắt: Ladislav Faigl | Public domain |
| Yitzhak Shamir | yitzhak-shamir | [File](https://commons.wikimedia.org/wiki/File:Yitzhak_Shamir_1992_Dan_Hadani_Archive.jpg) | Yolene Haik / I.P.P.A. / Dan Hadani collection, National Library of Israel | CC BY 4.0 |
| René Lévesque | rene-levesque | [File](https://commons.wikimedia.org/wiki/File:Ren%C3%A9_L%C3%A9vesque,_18_octobre_1960.jpg) | Yves Beauchamp | Public domain |
| Alex Salmond | alex-salmond | [File](https://commons.wikimedia.org/wiki/File:Alex_Salmond,_First_Minister_of_Scotland_(cropped).jpg) | The Scottish Government | OGL v1.0 |
| Carles Puigdemont | carles-puigdemont | [File](https://commons.wikimedia.org/wiki/File:Carles_Puigdemont_2024.jpg) | Parlament de Catalunya | Attribution |
| Ibn Saud | ibn-saud | [File](https://commons.wikimedia.org/wiki/File:Ibn_Saud.png) | Lcxzdf56 | Public domain |
| Hassan al-Banna | hassan-al-banna | [File](https://commons.wikimedia.org/wiki/File:Hassan_al-Banna.jpg) | Không rõ tác giả | Public domain |
| Sayyid Qutb | sayyid-qutb | [File](https://commons.wikimedia.org/wiki/File:Sayyid_Qutb.jpg) | Không rõ tác giả ảnh gốc; nguồn đăng: أحمد.غامدي.24 (Arabic Wikipedia) | Public domain |
| Mohamed Morsi | mohamed-morsi | [File](https://commons.wikimedia.org/wiki/File:Mohamed_Morsi-05-2013.jpg) | Wilson Dias/ABr | CC BY 3.0 br |
| Jamal al-Din al-Afghani | jamal-al-din-al-afghani | [File](https://commons.wikimedia.org/wiki/File:Al_afghani.jpg) | Yacquub cAbd al-cAziiz Abul Ala Maududi | Public domain |
| Muhammad Abduh | muhammad-abduh | [File](https://commons.wikimedia.org/wiki/File:Muhammad_Abduh.jpg) | Không rõ tác giả ảnh gốc; nguồn đăng: Zerida (English Wikipedia) | Public domain |
| Muhammad Iqbal | muhammad-iqbal | [File](https://commons.wikimedia.org/wiki/File:Iqbal_2.jpg) | Amrita Sher-Gil | Public domain |
| Rav Abraham Isaac Kook | abraham-isaac-kook | [File](https://commons.wikimedia.org/wiki/File:Avraham_Issac_Kook_portrait_cropped.JPG) | Shuki; bản cắt: אני ואתה | Public domain |
| Zvi Yehuda Kook | zvi-yehuda-kook | [File](https://commons.wikimedia.org/wiki/File:%D7%AA%D7%9E%D7%95%D7%A0%D7%AA_%D7%94%D7%A8%D7%A6%D7%99%22%D7%94.jpg) | Không rõ tác giả | Public domain |
| Yitzchak Yaacov Reines | yitzchak-yaacov-reines | [File](https://commons.wikimedia.org/wiki/File:Yitzchak_Yaacov_Reines.jpg) | Không rõ tác giả | Public domain |
| Thích Nhất Hạnh | thich-nhat-hanh | [File](https://commons.wikimedia.org/wiki/File:Thich_Nhat_Hanh_12_(cropped).jpg) | Duc (pixiduc) from Paris, France. | CC BY-SA 2.0 |
| B. R. Ambedkar | b-r-ambedkar | [File](https://commons.wikimedia.org/wiki/File:Dr._Bhimrao_Ambedkar.jpg) | Không rõ tác giả | Public domain |
| Sulak Sivaraksa | sulak-sivaraksa | [File](https://commons.wikimedia.org/wiki/File:Sulak_Sivaraksa_(cropped).jpg) | Individualist (German Wikipedia) | Public domain |
| John Adams | john-adams | [File](https://commons.wikimedia.org/wiki/File:John_Adams_A18236.jpg) | Gilbert Stuart | Public domain |
| John Marshall | john-marshall | [File](https://commons.wikimedia.org/wiki/File:John_Marshall_by_Henry_Inman,_1832.jpg) | Henry Inman | Public domain |
| John Jay | john-jay | [File](https://commons.wikimedia.org/wiki/File:John_Jay_(Gilbert_Stuart_portrait).jpg) | Gilbert Stuart | Public domain |
| Sidney Webb | sidney-webb | [File](https://commons.wikimedia.org/wiki/File:Sidney_Webb_(cropped).jpg) | W. & D. Downey | Public domain |
| Julian Huxley | julian-huxley | [File](https://commons.wikimedia.org/wiki/File:Hux-Oxon-72.jpg) | not given in the source | Public domain |
| Nick Bostrom | nick-bostrom | [File](https://commons.wikimedia.org/wiki/File:Prof_Nick_Bostrom_324-1.jpg) | Future of Humanity Institute | CC BY 4.0 |
| James Hughes | james-hughes-sociologist | [File](https://commons.wikimedia.org/wiki/File:James_Hughes.jpg) | Knightcap | CC BY-SA 4.0 |
| John Perry Barlow | john-perry-barlow | [File](https://commons.wikimedia.org/wiki/File:John_Perry_Barlow_2012.jpg) | Mohamed Nanabhay from Qatar | CC BY 2.0 |
| John Gilmore | john-gilmore | [File](https://commons.wikimedia.org/wiki/File:John_Gilmore_2009.jpg) | Joi Ito ( Joi @ Flickr ) | CC BY 2.0 |
| Rick Falkvinge | rick-falkvinge | [File](https://commons.wikimedia.org/wiki/File:Rickard_Falkvinge_-_2006-06-03_(Jon_%C3%85slund).jpg) | Jon Åslund | CC BY 2.5 |
| Birgitta Jónsdóttir | birgitta-jonsdottir | [File](https://commons.wikimedia.org/wiki/File:Praha,_PiCe,_Birgitta_J%C3%B3nsd%C3%B3ttir.jpg) | Aktron / Wikimedia Commons | CC BY 3.0 |
| Aaron Swartz | aaron-swartz | [File](https://commons.wikimedia.org/wiki/File:Aaron_Swartz_2_at_Boston_Wikipedia_Meetup,_2009-08-18.jpg) | Sage Ross | CC BY-SA 2.0 |
| Ngô Đình Thục | ngo-dinh-thuc | [File](https://commons.wikimedia.org/wiki/File:Bishop_Thuc,_Sept._11,_1963.jpg) | TommyJapan1 | CC BY 2.0 |
| Nick Land | nick-land | [File](https://commons.wikimedia.org/wiki/File:Nick_Land_October_2025_(1x1_cropped).jpg) | Koolisid | CC BY-SA 4.0 |
| Nikolai Trubetskoy | nikolai-trubetzkoy | [File](https://commons.wikimedia.org/wiki/File:Nikolai_Trubetzkoy.jpg) | Không rõ tác giả | Public domain |
| Lev Gumilyov | lev-gumilyov | [File](https://commons.wikimedia.org/wiki/File:%D0%9B%D0%B5%D0%B2%D0%93%D1%83%D0%BC%D0%B8%D0%BB%D1%91%D0%B21934.jpg) | Không rõ tác giả | Public domain |
| George Vernadsky | george-vernadsky | [File](https://commons.wikimedia.org/wiki/File:George_Vernandsky_1909.jpg) | Không rõ tác giả | Public domain |

## Các hồ sơ còn thiếu

Đã tra theo tên, tên chuyển hướng, danh mục Commons và mã Wikidata khi có. “Chưa tìm được” là kết quả lượt tra cứu này, không phải khẳng định không tồn tại ảnh. Những hồ sơ dưới đây tiếp tục dùng chữ cái đầu của hệ thống cho tới khi có chân dung đúng người và căn cứ sử dụng rõ ràng.

| Nhân vật | Mã | Kết quả kiểm tra |
| --- | --- | --- |
| Hardial Bains | hardial-bains | Chỉ tìm thấy ảnh bia mộ, không có chân dung. [File đã loại](https://commons.wikimedia.org/wiki/File:Hardial_Bains_Memorial_Beechwood.jpg) |
| George Grant | george-grant | Chưa tìm được chân dung đúng nhà triết học có giấy phép rõ ràng trên Commons; các ảnh gần tên là người khác. |
| Daniel A. Bell | daniel-a-bell | Các chân dung Daniel Bell tìm thấy là nhà xã hội học hoặc vận động viên, không phải Daniel A. Bell trong danh mục. |
| Thomas Mun | thomas-mun | Chỉ tìm thấy sách và tài liệu liên quan, chưa xác định được chân dung. |
| Shulamith Firestone | shulamith-firestone | Chưa tìm được chân dung Commons có giấy phép rõ ràng. |
| George Sessions | george-sessions | Trang Wikipedia đang gán không tồn tại; các ảnh tìm thấy liên quan George Sessions Perry, không phải nhà triết học sinh thái. |
| Ted Nordhaus | ted-nordhaus | Các ảnh gần tên thuộc William Nordhaus hoặc Steven Nordhaus; chưa tìm được chân dung Ted Nordhaus. |
| John Cowperthwaite | john-cowperthwaite | Chưa tìm được chân dung Commons có giấy phép rõ ràng. |
| Hillel Steiner | hillel-steiner | Chưa tìm được chân dung Commons có giấy phép rõ ràng. |
| Muhammad ibn Abd al-Wahhab | muhammad-ibn-abd-al-wahhab | Ảnh P18 là thư pháp tên người, không phải chân dung. [File đã loại](https://commons.wikimedia.org/wiki/File:محمد_بن_عبد_الوهاب.png) |
| Abd al-Aziz ibn Baz | ibn-baz | Các file tìm thấy là thư pháp tên người, không phải chân dung. [File đã loại](https://commons.wikimedia.org/wiki/File:Ibn_Baz.png) |
| Pierre Poujade | pierre-poujade | Các ảnh gần tên là Robert, Arthur hoặc Joseph Poujade; tranh M. Poujade thế kỷ XIX không thể là Pierre Poujade (1920–2003). |
| Mogens Glistrup | mogens-glistrup | File trong danh mục là tờ quảng cáo chính trị không có mặt người. [File đã loại](https://commons.wikimedia.org/wiki/File:Frp_DK_1976.jpg) |
| Timothy C. May | timothy-c-may | Chỉ tìm thấy tài liệu cypherpunk, chưa tìm được chân dung Commons có giấy phép rõ ràng. |
