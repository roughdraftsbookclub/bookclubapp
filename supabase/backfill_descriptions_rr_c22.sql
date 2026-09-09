-- Descriptions for the two books pinned to organizer-chosen editions in
-- fix_editions_red_rising_catch22.sql. Left null there because openlibrary.org
-- was down at the time; fetched from the work record now that it is back.
-- Work-level, as always - a description belongs to the book, not the printing.

-- Red Rising (work /works/OL17076473W). The work record opens with a dialogue
-- epigraph; trimmed to the summary, which is what the detail page wants.
update books set description = 'Darrow is a Red, a member of the lowest caste in the color-coded society of the future. Like his fellow Reds, he works all day, believing that he and his people are making the surface of Mars livable for future generations.

Yet he spends his life willingly, knowing that his blood and sweat will one day result in a better world for his children.

But Darrow and his kind have been betrayed. Soon he discovers that humanity already reached the surface generations ago. Vast cities and sprawling parks spread across the planet. Darrow—and Reds like him—are nothing more than slaves to a decadent ruling class.

Inspired by a longing for justice, and driven by the memory of lost love, Darrow sacrifices everything to infiltrate the legendary Institute, a proving ground for the dominant Gold caste, where the next generation of humanity''s overlords struggle for power. He will be forced to compete for his life and the very future of civilization against the best and most brutal of Society''s ruling class. There, he will stop at nothing to bring down his enemies... even if it means he has to become one of them to do so.' where id = 'bk8u0zhia';

-- Catch-22 (work /works/OL276798W).
update books set description = 'Catch-22 is like no other novel. It has its own rationale, its own extraordinary character. It moves back and forth from hilarity to horror. It is outrageously funny and strangely affecting. It is totally original. Set in the closing months of World War II in an American bomber squadron off Italy, Catch-22 is the story of a bombardier named Yossarian, who is frantic and furious because thousands of people he hasn''t even met keep trying to kill him. Catch-22 is a microcosm of the twentieth-century world as it might look to someone dangerously sane. It is a novel that lives and moves and grows with astonishing power and vitality -- a masterpiece of our time.' where id = 'bkbw12juh';
