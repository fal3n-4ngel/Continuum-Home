import { describe, it, expect } from "vitest";
import { parseGoodreadsRssXml } from "@/app/api/(core)/watchlist/goodreads/route";
import { parseGoodreadsCsv } from "@/features/media/lib/goodreads-csv";
import { validateSettingsPatch } from "@/lib/firebase/validate";

describe("Goodreads RSS Parser", () => {
  it("parses valid Goodreads RSS feed XML items into Continuum SyncEntries", () => {
    const mockXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Member's bookshelf: read</title>
          <item>
            <title><![CDATA[Dune (Dune Chronicles, #1)]]></title>
            <author_name><![CDATA[Frank Herbert]]></author_name>
            <book_large_image_url><![CDATA[https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414l/44767458.jpg]]></book_large_image_url>
            <book_published>1965</book_published>
            <user_rating>5</user_rating>
          </item>
          <item>
            <title>Project Hail Mary</title>
            <author_name>Andy Weir</author_name>
            <book_large_image_url>https://s.gr-assets.com/assets/nophoto/book/111x148-bcc042a9c91a29c1d680899eff700a03.png</book_large_image_url>
            <book_published>2021</book_published>
            <user_rating>4.5</user_rating>
          </item>
        </channel>
      </rss>
    `;

    const entries = parseGoodreadsRssXml(mockXml, "completed");

    expect(entries).toHaveLength(2);

    // Entry 1: Dune
    expect(entries[0].title).toBe("Dune (Dune Chronicles, #1)");
    expect(entries[0].type).toBe("book");
    expect(entries[0].status).toBe("completed");
    expect(entries[0].progress).toBe(1);
    expect(entries[0].year).toBe(1965);
    // 5 stars -> 10 on 10-point scale
    expect(entries[0].rating).toBe(10);
    expect(entries[0].coverImage).toBe("https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414l/44767458.jpg");

    // Entry 2: Project Hail Mary
    expect(entries[1].title).toBe("Project Hail Mary");
    expect(entries[1].type).toBe("book");
    expect(entries[1].status).toBe("completed");
    expect(entries[1].year).toBe(2021);
    // 4.5 stars -> 9 on 10-point scale
    expect(entries[1].rating).toBe(9);
    // Placeholder 'nophoto' image should be filtered out to null
    expect(entries[1].coverImage).toBeNull();
  });

  it("handles shelves with different status mappings", () => {
    const mockXml = `
      <rss>
        <channel>
          <item>
            <title>Neuromancer</title>
            <book_published>1984</book_published>
            <user_rating>0</user_rating>
          </item>
        </channel>
      </rss>
    `;

    const readingEntries = parseGoodreadsRssXml(mockXml, "watching");
    expect(readingEntries[0].status).toBe("watching");
    expect(readingEntries[0].progress).toBe(0);
    expect(readingEntries[0].rating).toBeNull(); // 0 rating is treated as unrated

    const toReadEntries = parseGoodreadsRssXml(mockXml, "plan_to_watch");
    expect(toReadEntries[0].status).toBe("plan_to_watch");
    expect(toReadEntries[0].progress).toBe(0);
  });
});

describe("Goodreads CSV Parser", () => {
  it("parses exported Goodreads CSV into Continuum book entries", () => {
    const mockCsv = `Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Recommended For,Recommended By,Owned Copies
123,"Hyperion","Dan Simmons","Simmons, Dan","",="0553283685",="9780553283686",5,4.24,"Spectra","Mass Market Paperback",482,1990,1989,2023/05/12,2023/01/15,"sci-fi, favorites","sci-fi (#1), favorites (#4)",read,"Masterpiece",,,1,,,0
456,"Snow Crash","Neal Stephenson","Stephenson, Neal","",="0553380958",="9780553380958",4,4.03,"Del Rey","Paperback",440,2000,1992,,2023/08/20,"sci-fi","sci-fi (#2)",currently-reading,"",,,1,,,0
789,"The Left Hand of Darkness","Ursula K. Le Guin","Le Guin, Ursula K.","",="0441478123",="9780441478125",0,4.08,"Ace Books","Paperback",304,1987,1969,,2024/02/01,"to-read","to-read (#10)",to-read,"",,,0,,,0
`;

    const result = parseGoodreadsCsv(mockCsv);

    expect(result.totalParsed).toBe(3);
    expect(result.books).toHaveLength(3);

    // Book 1: Hyperion
    const hyperion = result.books[0];
    expect(hyperion.title).toBe("Hyperion");
    expect(hyperion.type).toBe("book");
    expect(hyperion.status).toBe("completed");
    expect(hyperion.progress).toBe(1);
    expect(hyperion.rating).toBe(10); // 5 * 2
    expect(hyperion.year).toBe(1989); // Uses Original Publication Year if available

    // Book 2: Snow Crash
    const snowCrash = result.books[1];
    expect(snowCrash.title).toBe("Snow Crash");
    expect(snowCrash.status).toBe("watching");
    expect(snowCrash.progress).toBe(0);
    expect(snowCrash.rating).toBe(8); // 4 * 2
    expect(snowCrash.year).toBe(1992);

    // Book 3: The Left Hand of Darkness
    const darkness = result.books[2];
    expect(darkness.title).toBe("The Left Hand of Darkness");
    expect(darkness.status).toBe("plan_to_watch");
    expect(darkness.progress).toBe(0);
    expect(darkness.rating).toBeNull(); // 0 rating is unrated
    expect(darkness.year).toBe(1969);
  });

  it("handles empty or invalid CSV files gracefully", () => {
    const result = parseGoodreadsCsv("");
    expect(result.totalParsed).toBe(0);
    expect(result.books).toEqual([]);
  });
});

describe("Settings Goodreads Validation", () => {
  it("validates and accepts valid goodreads userId in settings patch", () => {
    const patch = validateSettingsPatch({
      integrations: {
        goodreads: {
          userId: "12345678-adi",
        },
      },
    });

    expect(patch.integrations?.goodreads?.userId).toBe("12345678-adi");
  });

  it("allows setting goodreads to null to disconnect integration", () => {
    const patch = validateSettingsPatch({
      integrations: {
        goodreads: null,
      },
    });

    expect(patch.integrations?.goodreads).toBeNull();
  });
});
