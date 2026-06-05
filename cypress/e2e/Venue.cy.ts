import { cities } from '../../config/conference-data';
import { City } from '../../types/types';
import { resolveCfpUrl } from '../../utils/pretalx';

it('should render guideline if cfp is open, and agenda otherwise', () => {
  cy.wrap(cities).each((city: City) => {
    cy.visit(`http://localhost:3000/venue/${city.name}`);

    cy.getTestData(`venue-${city.name}`).then((val) => {
      if (resolveCfpUrl(city.cfp)) {
        cy.getTestData('guideline-com').should('be.visible');
      } else {
        cy.getTestData('agenda-com').should('be.visible');
      }
    });
  });
});

// disbale this test file for now

// it("Should contain logos in Sponsor component", () => {
//     const eventSponsors = cities[0].sponsors.eventSponsors;

//     // const financialSponsor = cities[0].sponsors.financialSponsors;

//     cy.wrap(cities).each((city) => {
//         cy.visit(`http://localhost:3000/venue/${city.name}`);

//         cy.getTestData("sponsor-section").should("exist");

//         eventSponsors.forEach((sponsor) => {
//             cy.getTestData('sponsor-section')
//             .find(`img[src="${sponsor.image}"]`)
//             .should('be.visible');
//             cy.get(`a[href="${sponsor.websiteUrl}"]`).should('exist');
//         });

//         // financialSponsor.forEach((sponsor) => {
//         //     cy.getTestData('sponsor-section')
//         //     .find(`img[src="${sponsor.image}"]`)
//         //     .should('be.visible');
//         //     cy.get(`a[href="${sponsor.websiteUrl}"]`).should('exist');
//         // });
//     })
// });
