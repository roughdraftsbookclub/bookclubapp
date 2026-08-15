-- Manual completion of the 7 books the automated backfill (backfill_metadata.sql)
-- either skipped outright (Open Library's own data was wrong) or left partial.
-- Every value here came from the organizer directly, not an automated match.

-- 1984 (Orwell)
update books set first_publish_year = 1949, page_count = 342, description = 'In this world where freedom has been completely abolished, the protagonist of the novel, Winston Smith, decides to rebel and, although aware that this is considered a highly subversive activity, begins to write a diary. And when Winston falls in love with Julia, he must choose whether to submit to power or fight for a different world, one in which history is not rewritten by the ruling Party and in which even people''s thoughts are controlled. 1984 is one of the greatest political novels of the last century, capable of shaking our conscience with its visionary nature. It is both a denunciation of totalitarianism and a strenuous defense of individual integrity. The entire novel focuses on the contradictions of power, the conflict between the individual and society, and the deceptions of utopia.' where id = 'bk10';

-- Master and Commander (O'Brian)
update books set first_publish_year = 1969, page_count = 412, description = 'This, the first in the splendid series of Jack Aubrey novels, establishes the friendship between Captain Aubrey, R.N., and Stephen Maturin, ship''s surgeon and intelligence agent, against a thrilling backdrop of the Napoleonic wars. Details of a life aboard a man-of-war are faultlessly rendered: the conversational idiom of the officers in the ward room and the men on the lower deck, the food, the floggings, the mysteries of the wind and the rigging, and the roar of broadsides as the great ships close in battle.' where id = 'bk7';

-- No Country for Old Men (McCarthy)
update books set first_publish_year = 2005, page_count = 320, description = 'Llewelyn Moss, hunting antelope near the Rio Grande, instead finds men shot dead, a load of heroin, and more than $2 million in cash. Packing the money out, he knows, will change everything. But only after two more men are murdered does a victim''s burning car lead Sheriff Bell to the carnage out in the desert, and he soon realizes how desperately Moss and his young wife need protection. A harrowing story of a war that society is waging on itself, and an enduring meditation on the ties of love and blood and duty that inform lives and shape destinies, No Country for Old Men is a novel of extraordinary resonance and power.' where id = 'bkqpuetqu';

-- The Alchemist (Coelho)
update books set first_publish_year = 1988, page_count = 203, description = 'This story, dazzling in its powerful simplicity and soul-stirring wisdom, is about an Andalusian shepherd boy named Santiago who travels on a profound spiritual journey from his homeland in Spain to the Egyptian desert in search of a treasure buried near the Pyramids. Along the way he meets a Gypsy woman, a man who calls himself a king, and an alchemist, all of whom point Santiago in the direction of his quest. What starts out as a journey to find worldly goods turns into a discovery of his Personal Legend and the truth that the most valuable treasures are those found within.' where id = 'bk9';

-- Meditations (Marcus Aurelius) — an ancient text, no true "publication" date;
-- 170 CE is the organizer's chosen convention for when it was written.
update books set first_publish_year = 170, page_count = 254, description = 'Personal writings by Marcus Aurelius on Stoic philosophy.' where id = 'bk16';

-- The Heaven & Earth Grocery Store (McBride) — year was already on file
update books set page_count = 400, description = 'In 1972, when workers in Pottstown, Pennsylvania, were digging the foundations for a new development, the last thing they expected to find was a skeleton at the bottom of a well. Who the skeleton was and how it got there were two of the long-held secrets kept by the residents of Chicken Hill, the dilapidated neighborhood where immigrant Jews and African Americans lived side by side and shared ambitions and sorrows. When the truth is finally revealed about what happened on Chicken Hill and the part the town''s white establishment played in it, McBride shows us that even in dark times, it is love and community—heaven and earth—that sustain us.' where id = 'bk3';

-- The Lords of Discipline (Conroy) — year and page count were already on file
update books set description = 'A novel about coming of age, brotherhood, betrayal, and a man''s forging of his own personal code of honor. Will McLean, a senior on the cadets'' honor court, is an outsider by nature: a basketball star at a school that prizes military prowess above athletics, a military man in training who dares to question the escalating Vietnam war. And yet his greatest struggle will be with the corrupt institution of which he is a part.' where id = 'bk2';
