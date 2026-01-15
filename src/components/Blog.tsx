import { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight, Tag, Star, Quote } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { motion, AnimatePresence } from 'motion/react';
import { sharedGalleryImages } from './BlogData';
import { blogPost11GalleryImages } from './BlogPost11Data';
import { blogPost12GalleryImages } from './BlogPost12Data';

interface Testimonial {
  id: string;
  name: string;
  review: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Eamie & Ben',
    review: 'We can not thank Mark enough for our beautiful photos. From the very start he has been so kind and nothing was a bother to him. He made us both feel so relaxed and captured some amazing photos that we didn\'t even realise he was taken. A complete Gentleman and a pleasure to work with.',
  },
  {
    id: '2',
    name: 'Coleen & Blake',
    review: 'I can\'t praise Mark highly enough for the work he does! Mark photographed our Wedding only last week, and we have already received a bunch of beautiful photographs. Myself & my Husband would be camera shy, but Mark has a way of making you feel comfortable, have a laugh and capture beautiful memories without even realizing!',
  },
  {
    id: '3',
    name: 'Ciara & Conor',
    review: 'Where do I start.. right from the get go Mark was absolutely brilliant, he made us all feel so relaxed and made getting photos taken so easy! My husband is camera shy at best and Mark just made everything so easy, I am so glad we got him!',
  },
  {
    id: '4',
    name: 'Aoife & Andrea',
    review: 'We cannot recommend Mark highly enough. From the moment we met Mark, he made us feel completely at ease, something that meant the world to us as two brides who aren\'t the most comfortable in front of the camera. What we appreciated most were the candid photos, so many beautiful, genuine moments of us laughing and being ourselves.',
  },
  {
    id: '5',
    name: 'Gemma & Craig',
    review: 'Thanks Mark for the amazing photos from our wedding day. We now have the hard task of selecting for our album from such a multitude of beautiful photos. We would highly recommend Mark as a photographer. Mark was very professional and friendly and made us feel relaxed throughout our special day from start to finish.',
  },
  {
    id: '6',
    name: 'Shauna & Andrew',
    review: 'Mark photographed our wedding on 12th April 2025 at the Belmont House Hotel, Banbridge. We had a fairly big wedding with 160 guests, and it was a fantastic day. Mark didn\'t stop all day – he was literally running around capturing brilliant candid shots, as well as all the family photos we had requested.',
  },
  {
    id: '7',
    name: 'Charlotte & Declan',
    review: 'Myself and Dec were absolutely blown away by the initial sneak peak photos sent in from Mark on the evening of the wedding and couldn\'t wait to see the final images. Mark was absolutely amazing from start to finish! His use of lighting made for some really dramatic shots which we both loved.',
  },
  {
    id: '8',
    name: 'Hannah Wilson',
    review: 'We can\'t recommend Mark enough, he captured our wedding day at Lusty Beg perfectly! He knew where to take the best shots and even brought the sunshine with him! He made everyone feel comfortable and could have a laugh too. 10/10',
  },
  {
    id: '9',
    name: 'Robyn & Stuart',
    review: 'Breathtaking photos we will cherish forever. Mark was brilliant at both our engagement shoot and on our wedding day. He made us feel relaxed and at ease throughout. He was punctual, professional and kind. He brought a great energy to our wedding day and our guests were really impressed as well.',
  },
  {
    id: '10',
    name: 'Jen & Andy',
    review: 'Thank you so much Mark for our amazing photos. You made us feel so calm and relaxed on the day. You knew the exact photos to take to make the most of our venue despite the rain and nothing was too much trouble for you. You went above and beyond.',
  },
  {
    id: '11',
    name: 'Emma & Simon',
    review: 'What can I say about our incredible photos?! Thank you so much Mark for your support on the day and also your great work on our amazing photos. They are beyond what we expected and capture the day so perfectly for us in a candid fun way.',
  },
  {
    id: '12',
    name: 'Chloe & David',
    review: 'We have just received our photos from our wedding day at Killeavy Castle from Mark and we are amazed by them! Mark was a delight to work with and helped make our day as relaxing and enjoyable as he could. His work speaks for itself!',
  },
  {
    id: '13',
    name: 'Caolan & Bronagh',
    review: 'Mark was absolutely incredible from the date and hour we booked him. We were drawn to mark\'s work by his wonderful photos on Facebook, and we just loved his style. Nothing was a bother for Mark. You created the most beautiful images of us and we now have those to cherish forever.',
  },
  {
    id: '14',
    name: 'Michelle & James',
    review: 'What can I say about Mark! What an absolute gentleman!! He was literally the favourite part of our day! His kind and humorous personality literally put us at ease so much on our wedding day! The attention to detail, the professionalism, the kindness and banter that we had throughout our entire day will never be forgotten!',
  },
  {
    id: '15',
    name: 'Harriet & Ciaran',
    review: 'It\'s really hard to put into words how amazing Mark was. Mark was our photographer for our wedding in October. It was an absolute pleasure working with him from start to finish. Mark was so relaxed and calm and fitted into our day so perfectly. Not only is Mark an amazing photographer but also a real gentleman!',
  },
];

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  galleryImages?: string[]; // Optional array of additional images from the wedding day
}

const hardcodedBlogPosts: BlogPost[] = [
  {
    id: '12',
    title: 'Killeavy Castle wedding photography, Declan & Charlotte',
    excerpt: 'Killeavy castle wedding photography, natural and relaxed wedding photographer',
    content: 'Venue: Killeavy Castle, Newry: https://www.killeavycastle.com/ - Declan & Charlottes special day at Killeavy was such a fairytale wedding, from start to finish. I had previously met Charlotte as a bridesmaid for her sisters wedding, so it was such an honour to be invited back into their family home to start the day with the bridal prep fun. Working alongside the amazing Ellie from Chapter ii on video duty, we had a great morning with the girls and the boys before heading off to the ceremony and then Killeavy for the reception. The day flew by in a flash due to all the fun we had capturing the day, this was a day full of high energy and laughter - I loved it! Bride and bridesmaids dresses by Fairy tale design couture, Makeup by The look beauty salon, Flowers by Charlottes web floral studio, Hair by Blondies Hair salon.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-107.jpg',
    date: 'January 04, 2025',
    readTime: '31 min read',
    category: 'Real Weddings',
    tags: ['irishweddingphotographer', 'irishweddings', 'killeavycastle', 'killeavywedding', 'NIweddingphotographer', 'NIweddingphotography', 'NIweddings', 'relaxed wedding photography'],
    galleryImages: blogPost12GalleryImages,
  },
  {
    id: '11',
    title: 'Killeavy Castle wedding photography, Jenny & Gerard',
    excerpt: 'Killeavy castle wedding photography, northern ireland. Wedding photographer MKB weddings',
    content: 'Killeavy Castle, close to Newry in Northern Ireland is a venue that I often work in, due to the popularity of the place! Jenny & Gerards day at Killeavy was really something special, with the entire day full of fun, Ibiza inspired entertainment and non stop laughs. This really was a memorable wedding. Venue: https://www.killeavycastle.com',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100-3.jpg',
    date: 'May 28, 2024',
    readTime: '14 min read',
    category: 'Real Weddings',
    tags: ['irishweddingphotographer', 'irishweddings', 'NIweddingphotographer', 'NIweddingphotography', 'NIweddings', 'relaxed wedding photography'],
    galleryImages: blogPost11GalleryImages,
  },
  {
    id: '1',
    title: 'Killeavy Castle wedding photography, Jason & Victoria',
    excerpt: 'Killeavy Castle, located near to Newry, has burst onto the wedding scene over the past couple of years & has quickly become one of the most popular wedding venues in Northern Ireland.',
    content: 'Killeavy Castle, located near to Newry, has burst onto the wedding scene over the past couple of years & has quickly become one of the most popular wedding venues in Northern Ireland. I love spending time at Killeavy castle as a wedding photographer, the Castle itself looks like it has been lifted straight out of a Disney movie and the surrounding grounds are just as impressive, it\'s absolutely perfect. The energy at Victoria\'s family home during her preparation was on a different level, I knew instantly that this was going to be a special day. This wedding had it all, the weather (apart from a little rain on arrival!), laughter, a ring bearing dog & even some fireworks!',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-609-1024x683.jpg',
    date: 'May 14, 2024',
    readTime: '17 min read',
    category: 'Real Weddings',
    tags: ['Killeavy Castle', 'Northern Ireland weddings', 'relaxed wedding photography', 'Wedding couples', 'Bride getting ready moments', 'Castle and lakeside venues', 'Reception details', 'Wedding ring details'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-565-1-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-665-1-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-660-1-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-657-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-655-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-654-1-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-652-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-647-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-609-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-616-1-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-619-1-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-100-682x1024.jpg',
    ],
  },
  {
    id: '2',
    title: 'Clandeboye Lodge wedding photography, Stephanie & Callum',
    excerpt: 'Summer of 2023 was a summer to forget weather wise, with few days avoiding at least some rain! This wasn\'t the case for Stephanie & Callum, as the sun was shining all day long for them at the Clandeboye Lodge hotel.',
    content: 'Summer of 2023 was a summer to forget weather wise, with few days avoiding at least some rain! This wasn\'t the case for Stephanie & Callum, as the sun was shining all day long for them at the Clandeboye Lodge hotel, near Bangor, Northern Ireland. The Clandeboye Lodge has evolved over the years and now looks better than ever, with a fully refurbished interior and the great addition of the covered outdoor tipi area. This was a fun filled day in the sunshine, featuring their much loved little dog, Alfie, who was the star of the show at both the ceremony and a little later on for the first dance!',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-45-1024x682.jpg',
    date: 'May 9, 2024',
    readTime: '13 min read',
    category: 'Real Weddings',
    tags: ['Clandeboye Lodge', 'Northern Ireland weddings', 'summer weddings', 'Wedding couples', 'First dance moments', 'Bride getting ready moments', 'Reception details'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-7-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-11-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-14-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-16-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-19-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-24-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-28-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-33-1-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-35-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-39-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-52-684x1024.jpg',
    ],
  },
  {
    id: '3',
    title: 'Orange Tree House wedding photography, Pennie & Adam',
    excerpt: 'MKB weddings are a recommended wedding supplier by the Orange Tree House. When it comes to wedding venues ticking all the boxes, Orange tree house in Greyabbey has them all covered!',
    content: 'MKB weddings are a recommended wedding supplier by the Orange Tree House. When it comes to wedding venues ticking all the boxes, Orange tree house in Greyabbey has them all covered! Stunning backdrop, amazing service, perfect wedding organisation & probably the best wedding food in Ireland! Pennie & Adam both grew up close to Greyabbey, so having such a stunning venue close by was the perfect choice for them. From the moment I walked into Pennies house in the morning, I knew we were in for a fun day and it didn\'t disappoint!',
    image: 'https://mkbweddings.com/wp-content/uploads/M4L2Q1D-1024x682.jpg',
    date: 'May 9, 2024',
    readTime: '14 min read',
    category: 'Real Weddings',
    tags: ['Orange Tree House', 'Greyabbey weddings', 'Irish weddings', 'Wedding couples', 'Bride getting ready moments', 'Reception details', 'Bouquet arrangements'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MQDJ6UV-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/M4L2Q1M-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/M4L2Q1Q-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MQ3JL3V-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MQ3JL3R-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MQXIE6U-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MQXIE72-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MRHHLMG-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MR7HZUW-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MNLN5WX-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/M6HN77Z-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/M7VL7Q9-1024x682.jpg',
    ],
  },
  {
    id: '4',
    title: 'Millbrook Lodge wedding photography, Megan and Ethan',
    excerpt: 'Millbrook Lodge in Ballynahinch is a very popular wedding venue in Northern Ireland. I have a great deal of experience working at this gem of a venue, set amongst the amazing countryside.',
    content: 'Millbrook Lodge in Ballynahinch is a very popular wedding venue in Northern Ireland. I have a great deal of experience working at this gem of a venue, set amongst the amazing countryside. The venue has lots of great spots for the wedding photos with lots of open green space all around the hotel. Megan and Ethan had the perfect day at Millbrook Lodge with lots of sunshine and laughter throughout. We even got a visit from the Belfast Fire service for a photo opportunity during the evening! Congratulations Megan & Ethan.',
    image: 'https://mkbweddings.com/wp-content/uploads/MPDOSDI-1024x682.jpg',
    date: 'May 9, 2024',
    readTime: '12 min read',
    category: 'Real Weddings',
    tags: ['Millbrook Lodge', 'Ballynahinch weddings', 'countryside weddings', 'Wedding couples', 'Bride getting ready moments', 'Wedding cake details', 'Guest celebrations'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MD23N7P-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MD23N7O-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MD23N7Q-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MPNOE0Y-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MPNOE0Z-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MPNOE12-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MPDOSDQ-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MPDOSDP-1024x688.jpg',
      'https://mkbweddings.com/wp-content/uploads/MP3P6PO-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MP3P6PQ-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MOTPKY1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MOTPKY4-683x1024.jpg',
    ],
  },
  {
    id: '5',
    title: 'Orange Tree House wedding photography, Shannon & Daniel',
    excerpt: 'Orange tree house, Greyabbey is one of the finest venues in Northern Ireland. I\'m one of the Orange Tree house recommended wedding photographers, so I get the chance to work at the venue multiple times each year.',
    content: 'Orange tree house, Greyabbey is one of the finest venues in Northern Ireland. I\'m one of the Orange Tree house recommended wedding photographers, so I get the chance to work at the venue multiple times each year and it never loses it magic. Shannen and Daniel had the most amazing day at the Orange Tree House. The combination of the venue, the weather and this incredible couple made their day truly magical. From the moment they said their vows to the last dance, the air was filled with joy, laughter, and pure happiness. Their group of friends and family were on great form all day, creating an atmosphere of love and celebration.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-65-1-1024x682.jpg',
    date: 'May 13, 2024',
    readTime: '17 min read',
    category: 'Real Weddings',
    tags: ['Orange Tree House', 'Greyabbey weddings', 'Northern Ireland photographer', 'Wedding couples', 'Bride getting ready moments', 'Reception details', 'Golden hour photography'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-7-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-13-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-16-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-24-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-27-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-33-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-38-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-42-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-55-2-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-59-1024x684.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-63-3-1024x682.jpg',
    ],
  },
  {
    id: '6',
    title: 'Ballyscullion Park wedding photography, Clare & Ryan',
    excerpt: 'MKB weddings is a recommended wedding photographer at Ballyscullion park, so I get many opportunities to return to this amazing venue throughout the year!',
    content: 'MKB weddings is a recommended wedding photographer at Ballyscullion park, so I get many opportunities to return to this amazing venue throughout the year! There are many elements involved that have to come together to make the perfect wedding. This wedding brought them all together, combining the love of Clare & Ryan, the pure joy and happiness of their friends and family with the most stunning wedding venue. Ballyscullion park is always an absolute joy to return to, with a warm welcome from Rosalind and her amazing team at the venue. Clare & Ryan chose the palace ruins for their ceremony (this location was used during filming in the Game of Thrones!) and Liz Peel to officiate, who led a beautiful ceremony for the couple amongst the trees.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-42-1024x682.jpg',
    date: 'May 11, 2024',
    readTime: '18 min read',
    category: 'Real Weddings',
    tags: ['Ballyscullion Park', 'Game of Thrones location', 'outdoor ceremony', 'Wedding couples', 'Bride getting ready moments', 'Castle and lakeside venues', 'Reception details'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-5-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-10-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-13-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-17-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-20-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-29-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-36-1-1024x688.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-44-1-683x1024.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-57-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-60-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-65-1024x682.jpg',
    ],
  },
  {
    id: '7',
    title: 'Galgorm Spa & Resort wedding photography, Ciaran & Harriet',
    excerpt: 'Ciaran and Harriets wedding was a truly special day and marked my first visit to the Thompson family home over a 2 month period, with Harriets sister Hannah also getting married later in the year.',
    content: 'Ciaran and Harriets wedding was a truly special day and marked my first visit to the Thompson family home over a 2 month period, with Harriets sister Hannah also getting married later in the year. Harriets Mum and Dad, Sylvia and Colum made me feel instantly at home in their beautiful family home and snapping away during bridal prep was a joy with so much love and excitement in the house. Hillsborough parish church was just a short trip down the road, where I met up with Ciaran and the boys. Reverend Bryan Follis led a really uplifting ceremony in the stunning church, which has such a unique interior. We headed across to the Galgorm Spa & Resort for the reception and on arrival, the rain stopped and we were lucky enough to see an amazing late Autumn sun, providing the perfect light for some stunning shots around the grounds.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-66-1024x682.jpg',
    date: 'May 9, 2024',
    readTime: '22 min read',
    category: 'Real Weddings',
    tags: ['Galgorm Resort', 'Hillsborough church', 'autumn weddings', 'Autumn wedding ceremonies', 'Wedding couples', 'Bride getting ready moments', 'Wedding ring details', 'Reception details', 'Bouquet arrangements', 'Wedding cake details', 'Guest celebrations'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-17-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-42-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-79-1024x682.jpg',
      'https://images.unsplash.com/photo-1637533541297-bf0b2d689672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdXR1bW4lMjB3ZWRkaW5nJTIwY2VyZW1vbnl8ZW58MXx8fHwxNzY1ODAwNzU5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1519741414274-5b1ee71137fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY291cGxlJTIwYXV0dW1ufGVufDF8fHx8MTc2NTgwMDc1OXww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlkZSUyMGdldHRpbmclMjByZWFkeXxlbnwxfHx8fDE3NjU3NDcxNTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1563292674-a6d442bbc4a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmluZ3MlMjBkZXRhaWx8ZW58MXx8fHwxNzY1NzkzNDQ0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677768062274-fdd45caac233?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwZGV0YWlsc3xlbnwxfHx8fDE3NjU3Mjc2MDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1692167900605-e02666cadb6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwYm91cXVldCUyMGZsb3dlcnN8ZW58MXx8fHwxNzY1Nzk3OTYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1604531825889-88dc0c7e37db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2FrZSUyMGRldGFpbHN8ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1761499101934-4c79d09b14e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZ3Vlc3RzJTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    ],
  },
  {
    id: '8',
    title: 'Bellingham Castle wedding photography, Johana & Nathan',
    excerpt: 'Bellingham castle is nestled in the medieval town of Castlebellingham in County Louth. The castle and gardens at Bellingham Castle are perfect for weddings.',
    content: 'Bellingham castle is nestled in the medieval town of Castlebellingham in County Louth. The castle and gardens at Bellingham Castle are perfect for weddings, providing endless opportunities for pictures. It\'s also an exclusive venue, so wedding guests are free to make use of the hotel and grounds without any non wedding guests around! Johana & Nathans big day at Bellingham castle was amazing, with the weather being kind to them all day. Johana and her bridesmaids all looked fantastic in their custom dresses which were made by the mother of the bride.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-bellingham-castle-wedding-photography-previews-368-1024x682.jpg',
    date: 'May 12, 2024',
    readTime: '12 min read',
    category: 'Real Weddings',
    tags: ['Bellingham Castle', 'Irish weddings', 'castle weddings', 'Castle and lakeside venues', 'Wedding couples', 'Bride getting ready moments', 'Wedding ring details', 'Reception details', 'Bouquet arrangements', 'Wedding cake details', 'First dance moments', 'Guest celebrations'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-bellingham-castle-wedding-photography-previews-16-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-bellingham-castle-wedding-photography-previews-67-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-bellingham-castle-wedding-photography-previews-187-1024x683.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-bellingham-castle-wedding-photography-previews-292-683x1024.jpg',
      'https://images.unsplash.com/photo-1663185776079-33231c5242eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXN0bGUlMjB3ZWRkaW5nJTIwdmVudWV8ZW58MXx8fHwxNzY1ODAwNzYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlkZSUyMGdldHRpbmclMjByZWFkeXxlbnwxfHx8fDE3NjU3NDcxNTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1563292674-a6d442bbc4a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmluZ3MlMjBkZXRhaWx8ZW58MXx8fHwxNzY1NzkzNDQ0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677768062274-fdd45caac233?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwZGV0YWlsc3xlbnwxfHx8fDE3NjU3Mjc2MDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1692167900605-e02666cadb6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwYm91cXVldCUyMGZsb3dlcnN8ZW58MXx8fHwxNzY1Nzk3OTYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1604531825889-88dc0c7e37db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2FrZSUyMGRldGFpbHN8ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1728713351269-79d2e63926f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmlyc3QlMjBkYW5jZXxlbnwxfHx8fDE3NjU4MDA3NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1761499101934-4c79d09b14e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZ3Vlc3RzJTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    ],
  },
  {
    id: '9',
    title: 'Crover House Hotel wedding photography, Kerry & Craig',
    excerpt: 'Crover House Hotel in Cavan, Ireland is a stunning Hotel, set beside one of the many Loughs that the region is famous for. This was my first visit to the venue and it didn\'t disappoint.',
    content: 'Crover House Hotel in Cavan, Ireland is a stunning Hotel, set beside one of the many Loughs that the region is famous for. This was my first visit to the venue and it didn\'t disappoint. Kerry spent the morning getting ready in a log cabin alongside the lough which had incredible views & provided the perfect privacy to get prepared for the day ahead. I also met Bob Lyons from Lyons Digital media and had a great laugh as we captured the bridal party prep. Craig and the boys waited above the cabin in the main hotel, taking shelter from the occasional shower. The heavens opened during the heart warming, funny and emotional ceremony, perfectly delivered by Rhona. Shortly afterwards, the skies cleared and we enjoyed the remainder of the day with lots of sunshine, fun and laughter.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-crover-house-hotel-cavan-wedding-photography-crover-house-wedding-photography-44-1024x682.jpg',
    date: 'May 9, 2024',
    readTime: '14 min read',
    category: 'Real Weddings',
    tags: ['Crover House', 'Cavan weddings', 'lakeside weddings', 'Castle and lakeside venues', 'Wedding couples', 'Bride getting ready moments', 'Wedding ring details', 'Reception details', 'Bouquet arrangements', 'Wedding cake details', 'First dance moments', 'Guest celebrations'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-crover-house-hotel-cavan-wedding-photography-crover-house-wedding-photography-4-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-crover-house-hotel-cavan-wedding-photography-crover-house-wedding-photography-13-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-crover-house-hotel-cavan-wedding-photography-crover-house-wedding-photography-34-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-crover-house-hotel-cavan-wedding-photography-crover-house-wedding-photography-59-1024x682.jpg',
      'https://images.unsplash.com/photo-1707193393457-dcc36acb181c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWtlc2lkZSUyMHdlZGRpbmclMjBjZXJlbW9ueXxlbnwxfHx8fDE3NjU4MDA3NjF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlkZSUyMGdldHRpbmclMjByZWFkeXxlbnwxfHx8fDE3NjU3NDcxNTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1563292674-a6d442bbc4a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmluZ3MlMjBkZXRhaWx8ZW58MXx8fHwxNzY1NzkzNDQ0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677768062274-fdd45caac233?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwZGV0YWlsc3xlbnwxfHx8fDE3NjU3Mjc2MDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1692167900605-e02666cadb6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwYm91cXVldCUyMGZsb3dlcnN8ZW58MXx8fHwxNzY1Nzk3OTYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1604531825889-88dc0c7e37db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2FrZSUyMGRldGFpbHN8ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1728713351269-79d2e63926f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmlyc3QlMjBkYW5jZXxlbnwxfHx8fDE3NjU4MDA3NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1761499101934-4c79d09b14e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZ3Vlc3RzJTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    ],
  },
  {
    id: '10',
    title: 'Ballyscullion Park wedding photography, Amy & Daniel',
    excerpt: 'MKB weddings is a recommended wedding photographer at Ballyscullion park, so I have the joy of spending many dates here across the year. This venue has such a lovely family feel.',
    content: 'MKB weddings is a recommended wedding photographer at Ballyscullion park, so I have the joy of spending many dates here across the year. This venue has such a lovely family feel, with a much more personal touch than most other venues, with the owners taking an active role in the day, making sure everything runs perfectly! The sun was shining for Amy & Daniel, which allowed us to explore the vast grounds of the venue and take in all the stunning backdrops. Actually, it was so hot in the sun, that we opted to explore the woods initially and into the Game of Thrones filming location to get some shelter from the intense sunlight. The gardens at Ballyscullion Park are perfectly placed to get the most out of the stunning golden light from the setting sun.',
    image: 'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Ballyscullion-park-Wedding-photography-ballyscullion-park-wedding-photography-39-1-1024x682.jpg',
    date: 'May 9, 2024',
    readTime: '13 min read',
    category: 'Real Weddings',
    tags: ['Ballyscullion Park', 'Game of Thrones location', 'golden hour', 'Golden hour photography', 'Wedding couples', 'Bride getting ready moments', 'Wedding ring details', 'Reception details', 'Bouquet arrangements', 'Wedding cake details', 'First dance moments', 'Guest celebrations'],
    galleryImages: [
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Ballyscullion-park-Wedding-photography-ballyscullion-park-wedding-photography-1-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Ballyscullion-park-Wedding-photography-ballyscullion-park-wedding-photography-16-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Ballyscullion-park-Wedding-photography-ballyscullion-park-wedding-photography-31-1024x682.jpg',
      'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Ballyscullion-park-Wedding-photography-ballyscullion-park-wedding-photography-55-1-1024x682.jpg',
      'https://images.unsplash.com/photo-1660294502608-d65e5c62f244?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjBob3VyJTIwd2VkZGluZ3xlbnwxfHx8fDE3NjU4MDA3NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlkZSUyMGdldHRpbmclMjByZWFkeXxlbnwxfHx8fDE3NjU3NDcxNTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1563292674-a6d442bbc4a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmluZ3MlMjBkZXRhaWx8ZW58MXx8fHwxNzY1NzkzNDQ0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677768062274-fdd45caac233?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwZGV0YWlsc3xlbnwxfHx8fDE3NjU3Mjc2MDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1692167900605-e02666cadb6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwYm91cXVldCUyMGZsb3dlcnN8ZW58MXx8fHwxNzY1Nzk3OTYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1604531825889-88dc0c7e37db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2FrZSUyMGRldGFpbHN8ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1728713351269-79d2e63926f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmlyc3QlMjBkYW5jZXxlbnwxfHx8fDE3NjU4MDA3NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1761499101934-4c79d09b14e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZ3Vlc3RzJTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzY1ODAwNzYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    ],
  },
];

export function Blog() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>(hardcodedBlogPosts);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Hero carousel images from featured wedding stories
  const heroCarouselImages = [
    'https://mkbweddings.com/wp-content/uploads/MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-107.jpg',
    'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-65-1-1024x682.jpg',
    'https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-42-1024x682.jpg',
    'https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-66-1024x682.jpg',
    'https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-45-1024x682.jpg',
  ];

  // Hero carousel auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroCarouselImages.length]);

  // Load custom posts from localStorage and merge with hardcoded posts
  useEffect(() => {
    const savedPosts = localStorage.getItem('mkb_blog_posts');
    if (savedPosts) {
      try {
        const customPosts: BlogPost[] = JSON.parse(savedPosts);
        // Merge custom posts with hardcoded posts (custom posts first)
        setAllBlogPosts([...customPosts, ...hardcodedBlogPosts]);
      } catch (error) {
        console.error('Error loading custom blog posts:', error);
        setAllBlogPosts(hardcodedBlogPosts);
      }
    }
  }, []);

  // Scrolling banner animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev - 1);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Create duplicated array for infinite scroll
  const scrollingTestimonials = [...testimonials, ...testimonials, ...testimonials];

  const filteredPosts = allBlogPosts;

  if (selectedPost) {
    return (
      <div className="pt-20 min-h-screen">
        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-6 py-16">
          <button
            onClick={() => setSelectedPost(null)}
            className="mb-8 text-foreground/60 hover:text-primary transition-colors"
          >
            ← Back to Stories and Reviews
          </button>

          <h1 className="text-4xl md:text-5xl mb-6">{selectedPost.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-foreground/60 mb-8">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{selectedPost.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{selectedPost.readTime}</span>
            </div>
          </div>

          <div className="aspect-[16/9] mb-8 overflow-hidden">
            <ImageWithFallback
              src={selectedPost.image}
              alt={selectedPost.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-foreground/80 mb-6">{selectedPost.excerpt}</p>
            <p className="text-foreground/70 leading-relaxed">{selectedPost.content}</p>
            
            {/* Placeholder for more content */}
            <p className="text-foreground/70 leading-relaxed mt-6">
              This is where the full blog post content would continue. Each week, we share insights,
              tips, and behind-the-scenes stories from our wedding photography experiences. Stay tuned
              for more detailed articles covering everything from technical photography advice to
              wedding planning inspiration.
            </p>
          </div>

          {/* Wedding Day Gallery */}
          {selectedPost.galleryImages && selectedPost.galleryImages.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl mb-8">Photos from the Wedding Day</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPost.galleryImages.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-[4/3] overflow-hidden bg-secondary group cursor-pointer"
                  >
                    <ImageWithFallback
                      src={image}
                      alt={`Wedding photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-primary/20">
            <div className="flex items-center gap-2 mb-3 text-foreground/60">
              <Tag size={16} />
              <span>Tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-secondary text-foreground/60 text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Carousel Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <ImageWithFallback
              src={heroCarouselImages[currentSlide]}
              alt={`Wedding story ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </motion.div>
        </AnimatePresence>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroCarouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-accent scale-125'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
            <h1 className="tagline text-white mb-6" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
              Stories and Reviews
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Real weddings, client reviews, tips, and inspiration from Northern Ireland and beyond
            </p>
          </div>
        </div>
      </section>

      {/* Scrolling Testimonials Banner */}
      <section className="py-12 bg-primary text-white overflow-hidden">
        <div className="flex" style={{ transform: `translateX(${scrollPosition}px)` }}>
          {scrollingTestimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.id}-${index}`}
              className="flex-shrink-0 px-8 flex items-start gap-4"
              style={{ minWidth: '600px', maxWidth: '600px' }}
            >
              <Quote size={28} className="flex-shrink-0 text-white/30 mt-1" />
              <div>
                <p className="text-white/90 mb-2 italic leading-relaxed" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                  "{testimonial.review}"
                </p>
                <p className="text-white/70 text-sm">— {testimonial.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <div className="aspect-[4/3] mb-4 overflow-hidden bg-secondary">
                <ImageWithFallback
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              <h2 className="text-2xl mb-3 group-hover:underline">
                {post.title}
              </h2>

              <p className="text-foreground/70 mb-4 line-clamp-2">
                {post.excerpt}
              </p>

              <div className="flex items-center justify-between text-sm text-foreground/60">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{post.readTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More
                  <ArrowRight size={16} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-24 px-6 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl mb-6">Stay Updated</h2>
          <p className="text-xl text-white/80 mb-8">
            Get our latest tips and wedding inspiration delivered to your inbox every week.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-white"
            />
            <button className="bg-white text-primary px-8 py-3 hover:bg-white/90 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}