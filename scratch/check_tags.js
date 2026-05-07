import fs from 'fs';

const content = fs.readFileSync('c:/Users/badre/Desktop/MARKETPLACE-APP/src/pages/AlbumDetails.jsx', 'utf8');

function countTags(tagName) {
    const opening = (content.match(new RegExp('<' + tagName + '(\\s|>|$)', 'g')) || []).length;
    const closing = (content.match(new RegExp('</' + tagName + '>', 'g')) || []).length;
    return { opening, closing };
}

console.log('div:', countTags('div'));
console.log('header:', countTags('header'));
console.log('section:', countTags('section'));
console.log('Button:', countTags('Button'));
console.log('Modal:', countTags('Modal'));
