# coding: utf-8
"""Build 50 photographed/filmed Marvel character portraits as 512x512 WebP."""
import io, csv, re, json, html, sys, zipfile, time
from pathlib import Path
from PIL import Image, ImageOps, ImageFile
import requests
from bs4 import BeautifulSoup
ImageFile.LOAD_TRUNCATED_IMAGES = True
DATA = """Люк Кейдж	https://hips.hearstapps.com/digitalspyuk.cdnds.net/16/39/1475168661-luke-cage-s01e01-01.jpeg?crop=0.8101449275362319xw%3A1xh%3Bcenter%2Ctop&resize=1200%3A%2A
Джин Грей	https://img.huffingtonpost.com/asset/5cfaf0d5240000280f85a10e.jpeg
Говард Старк	https://resizer.mail.ru/p/b6a56dee-a274-5da1-b2d0-2e707bd8ca58/dpr%3A195/AQACIXtPOQylWKXlyuJ2V_DyX-K31IW5skAvbPYWJ6p7HtJUqeyb4lA2W9gv9pK3e-M75QUo7-O4_1ACsUzZ01lPf5I.png
Эдвин Джарвис	https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/edwin-jarvis-agent-carter-james-darcy-1556194933.jpg?crop=1xw%3A1xh%3Bcenter%2Ctop&resize=480%3A%2A
Джанет ван Дайн	https://i.pinimg.com/736x/f1/20/fd/f120fd5c62245c07e8f4ebc859f1a721.jpg
Кэсси Лэнг	https://i.pinimg.com/originals/95/0f/11/950f11c7cebdb48d4ccff8b6fc33db2c.jpg
Мэй Паркер	https://peru21.pe/sites/default/efsfiles/2023-10/A2YV2A5J5BAETMIUU3LBNYMLUM.jpg
Джей Джона Джеймсон	https://www.denofgeek.com/wp-content/uploads/2021/12/Spider-Man-Far-From-Home-Jameson.jpg?resize=768%2C432
Квентин Бек - Мистерио	https://p2.trrsf.com/image/fget/cf/1200/1200/middle/images.terra.com/2023/06/09/684204120-e40334e2163aeabb35a406891aeb5773.jpg
Макс Диллон - Электро	https://imgix.bustle.com/uploads/image/2021/12/21/755f7661-51ae-4fbd-8e82-64cec099345b-b35b2bce-19f8-425c-b3f6-5a06f5d92e1b-electro-no-way-home.jpeg?crop=faces&fit=crop&fm=jpg&h=900&w=1200
Карл Мордо	https://cdn.mos.cms.futurecdn.net/v2/t%3A0%2Cl%3A280%2Ccw%3A720%2Cch%3A720%2Cq%3A80%2Cw%3A720/zygeSZHRGzJtFbKaPzURun.jpg
Древняя	https://hips.hearstapps.com/hmg-prod/images/ancient-one-eye-of-agamotto-1550508109.jpg?crop=1.00xw%3A1.00xh%3B0%2C0&resize=980%3A%2A
Кристин Палмер	https://i.pinimg.com/originals/f0/e7/96/f0e796e1719cde350eb78b5883b67656.jpg
Клеа	https://i.pinimg.com/originals/92/e8/f9/92e8f9e59b471d1dd14fbb2d2aa96451.jpg
Билли Максимофф	https://cdn.marvel.com/content/2x/joelocke5.jpeg
Рио Видаль - Смерть	https://res.cloudinary.com/ybmedia/image/upload/c_crop%2Ch_676%2Cw_1014%2Cx_93%2Cy_0/c_fill%2Cf_auto%2Ch_1200%2Cq_auto%2Cw_1200/v1/m/0/3/039714aaac3c49c53d7db7a4310d53b0cd3c3fff/Agatha-All-Along-Aubrey-Plaza-Death.jpg
Лейла - Алая Скарабей	https://images2.minutemediacdn.com/image/upload/c_fill%2Cw_1200%2Car_1%3A1%2Cf_auto%2Cq_auto%2Cg_auto/shape/cover/sport/b7e165748cff2446bfcea1d4e7d5dc56e0cde0dba076bed1f1cc38881e8f4ba8.jpg
Джек Рассел - Ночной оборотень	https://www.etonline.com/sites/default/files/styles/720x720/public/images/2022-10/A006C008_220323_AP90_00098859%20copy.jpg?h=c673cd1c
Эльза Бладстоун	https://images2.minutemediacdn.com/image/upload/c_fill%2Cw_720%2Car_16%3A9%2Cf_auto%2Cq_auto%2Cg_auto/shape/cover/sport/4d8b8eabaddce0b3ed41158c5fe38fce2eba44f4088d05ce319048e84f7b8ad2.jpg
Человек-штука (Тед)	https://cdn.mos.cms.futurecdn.net/PBNesdqh2D2mTVK5VeUvdm-1200-80.jpg
Накия	https://lumiere-a.akamaihd.net/v1/images/eb_blackpanther-wf_nakia_sp_eea8028c.jpeg?region=0%2C0%2C1024%2C768&width=960
Рамонда	https://images.squarespace-cdn.com/content/v1/639babf6d3544a2a17af6dac/1706765180751-V34KSKHUZUSB2M0PXE5R/655661db26a4eb829a4ff365101f948a.jpg
Эверетт Росс	https://lumiere-a.akamaihd.net/v1/images/eb_blackpanther-wf_everett-k-ross_sp_2792ce70.jpeg?region=0%2C0%2C1024%2C768&width=960
Улисс Кло	https://d26oc3sg82pgk3.cloudfront.net/files/media/edit/image/60494/square_thumb%403x.jpg
Мария Рамбо	https://imgix.bustle.com/uploads/image/2019/3/8/86377ee2-0c06-4e40-b3e9-d089ce2ec492-opw-09639_r_e0282682.jpeg?crop=faces&fit=crop&fm=jpg&h=1200&w=1200
Талос	https://cdn.mos.cms.futurecdn.net/v2/t%3A0%2Cl%3A300%2Ccw%3A600%2Cch%3A600%2Cq%3A80%2Cw%3A600/mwHJbKCswAuUXUmwizbZPM.jpg
Г’иа	https://minutemedia-ressh.cloudinary.com/image/upload/v1700664016/shape/cover/sport/65fd33ac0e96334d52a1bfaa21f9cad1801e1e0defb02764207e145dd3dc9047.jpg
Эго	https://static.kino.de/65/fe/30/a618ddfef4a8b17e19b2ee9038_ZmMgODAwMDgwMDBmZmZmIDE2MDAgMTIwMAM2ZWE4ZjRiZWJlMw%3D%3D.jpeg
Высший Эволюционер	https://www.slashfilm.com/img/gallery/guardians-of-the-galaxy-vol-3-used-mostly-practical-effects-for-that-gory-face-reveal/l-intro-1684774545.jpg
Ронан Обвинитель	https://www.cultjer.com/img/ug_photo/2014_07/9b0571ebgw1ei578w6nt4j21kw11vq20140716182035.jpg
Коллекционер	https://media.wired.com/photos/5927311b7034dc5f91bede1a/3%3A2/w_2560%2Cc_limit/BenicioDelToro.jpg
Серси	https://i.pinimg.com/originals/c3/c3/5c/c3c35c12774e5eeefcbcb7516e6b0d55.jpg
Икарис	https://cdn.mos.cms.futurecdn.net/v2/t%3A0%2Cl%3A160%2Ccw%3A960%2Cch%3A720%2Cq%3A80%2Cw%3A960/kCNuUgizi86jXZEG7WKnXP.jpeg
Тена	https://catalog.cinema-api.com/cf/images/ncg-images/4c90cc55627043058872d9b78ecc4542.jpg?version=F8EBF5AF7704914DDA54491C6022CF58&width=800
Дейн Уитмен	https://www.looper.com/img/gallery/black-knights-ebony-blade-explained/l-intro-1636139325.jpg
Один	https://www.looper.com/img/uploads/2016/08/Odin.jpg
Хеймдалль	https://i.pinimg.com/originals/0b/e0/30/0be030c4a2005bb1649c2e586efafe38.jpg
Корг	https://imgix.bustle.com/uploads/image/2018/4/6/3b592d2c-0cc7-48a7-942b-811d59797a45-korg.png?crop=faces&fit=crop&fm=jpg&h=1200&w=1200
Грандмастер	https://www.syfy.com/sites/syfy/files/styles/scale_1280/public/2019/08/jeff-goldblum.jpg
Горр Убийца богов	https://lumiere-a.akamaihd.net/v1/images/g_disneyplus_thorloveandthunder_stills_14_aa626d33.jpeg?region=1%2C0%2C1298%2C730
Арним Зола	https://m.media-amazon.com/images/M/MV5BMTA1MTM2NzMzNjheQTJeQWpwZ15BbWU3MDk0Mjk5OTU%40._V1_.jpg
Шэрон Картер	https://i.insider.com/6083207b1041d50019f2e01c?auto=webp&format=jpeg&width=800
Эмиль Блонски - Мерзость	https://www.looper.com/img/gallery/she-hulk-episode-3-finally-explains-what-wong-was-doing-with-the-abomination-in-shang-chi/l-intro-1661792781.jpg
Сэмюэл Стернс - Лидер	https://m.media-amazon.com/images/M/MV5BMzliZWNiOWYtNGU2My00MDJiLWJlZTMtNTc1MDVmZTRmYzlmXkEyXkFqcGc%40._V1_.jpg
Валентина Аллегра де Фонтейн	https://cdn.mos.cms.futurecdn.net/68CzAJooUuronqviZeEfN3-1200-80.jpg
Мелина Востокова	https://imagenes.excelsior.com.mx/files/og_thumbnail/uploads/2021/07/10/692046423ea77.jpeg
Эйва Старр - Призрак	https://cdn.marvel.com/content/2x/ghost2.webp
Таскмастер (Антония Дрейкова)	https://m.media-amazon.com/images/M/MV5BNDY1NDg3OTQtYTFjYi00NzM3LWFiYmYtY2VjZDU3M2FhYzA3XkEyXkFqcGc%40._V1_FMjpg_UX1000_.jpg
Сильвия	https://images.squarespace-cdn.com/content/v1/5f0e06927230f8186d6f64ac/575ea5ac-1dbc-455f-b62c-10a934f9f57d/MV5BYTc4M2FjMzctN2ZjOC00YjI1LWEwYzktMWY2ZGZmODU4NzMzXkEyXkFqcGdeQXVyODk4OTc3MTY%40._V1_.jpg
Мобиус	https://imgix.bustle.com/uploads/image/2021/6/24/0e825885-1c2f-42cc-97a5-4875115324b5-screen-shot-2021-06-24-at-23734-pm.png?crop=faces&fit=crop&fm=jpg&h=1200&w=1200"""
ITEMS = [tuple(line.split("\t", 1)) for line in DATA.splitlines()]
assert len(ITEMS) == 50, f"Expected 50; got {len(ITEMS)}"
HERE = Path(__file__).resolve().parent
OUT = HERE / "output"; OUT.mkdir(exist_ok=True)
ses = requests.Session()
ses.headers.update({"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36", "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"})
def get_image(url):
    r = ses.get(url,timeout=18);r.raise_for_status()
    if not 6000 < len(r.content) < 25000000: raise ValueError("invalid bytes")
    im = Image.open(io.BytesIO(r.content));im.load()
    if min(im.size)<320: raise ValueError("low resolution")
    return im
def search(q):
    try:
        r=ses.get("https://www.bing.com/images/search",params={"q":q},timeout=18);r.raise_for_status()
        soup=BeautifulSoup(r.text,"html.parser");urls=[]
        for a in soup.select("a.iusc"):
            try:
                u=json.loads(a.get("m","{}")).get("murl")
                if u and u.startswith("http"):urls.append(u)
            except Exception:pass
        return urls[:12]
    except Exception as e:
        print("Search unavailable",str(e)[:90],flush=True);return []
with (HERE/"sources.csv").open("w",encoding="utf-8-sig",newline="") as sf:
    writer=csv.writer(sf);writer.writerow(["Персонаж","Источник"])
    failures=[]
    for index,(name,url) in enumerate(ITEMS,1):
        candidates=[url]
        for attempt in range(2):
            done=False
            for candidate in dict.fromkeys(candidates):
                try:
                    im=get_image(candidate)
                    im=ImageOps.fit(im.convert("RGB"),(512,512),Image.Resampling.LANCZOS,centering=(0.5,0.4))
                    im.save(OUT/(name+".webp"),"WEBP",quality=91,method=6)
                    writer.writerow([name,candidate])
                    print(f"{index:02}/50 OK {name}",flush=True)
                    done=True;break
                except Exception as e:
                    print(f"{index:02}/50 retry {name} {str(e)[:95]}",flush=True)
            if done:break
            candidates=search(name+" Marvel MCU film tv still")
        if not done:
            failures.append(name);print(f"{index:02}/50 FAILED {name}",flush=True)
        time.sleep(0.1)
(HERE/"failed.txt").write_text("\n".join(failures),encoding="utf-8")
archive=HERE/"КВМ — персонажи 1-50.zip"
with zipfile.ZipFile(archive,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(OUT.glob("*.webp")):z.write(p,arcname=p.name)
print(f"RESULT images={50-len(failures)} failures={len(failures)} zip_bytes={archive.stat().st_size}",flush=True)
if failures: sys.exit(2)
