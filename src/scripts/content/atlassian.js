'use strict';
import CustomTemplateMessenger from '../lib/customTemplateMessenger';
import CustomTemplateParser from '../lib/customTemplateParser';

const getDescription = (issueNumberElement) => () => {
  let description = '';
  // Title/summary of the issue - we use the hidden "edit" button that's there for a11y
  // in order to avoid picking up actual page title in the case of issue-list-pages.
  const titleElement = document.querySelector('h1 ~ button[aria-label]');

  if (issueNumberElement) {
    // Inspect deeper to avoid other hidden elements which can contain text
    // https://github.com/toggl/toggl-button/issues/1644
    const issueLink = issueNumberElement.querySelector('a');
    if (issueLink) {
      description += issueLink.textContent.trim();
    }
  }

  if (titleElement && titleElement.previousSibling) {
    if (description) description += ' ';
    description += titleElement.previousSibling.textContent.trim();
  }

  return description;
};

const getEpicName = () => {
  return $('[data-test-id="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-parent-issue-container"]').innerText.split('\n/')[0];
};

function getProject () {
  let project = '';
  let projectElement;

  // Best effort to find the "Project switcher" found in the sidebar of most pages, and extract
  // the project name from that. Historically project has not always been picked up reliably in Jira.
  projectElement = $('[data-test-id="navigation-apps.project-switcher-v2"] button > div:nth-child(2) > div');
  // Attempt to find the project name in page subtitle in case the sidebar is hidden
  if (!projectElement) projectElement = $('a[href^="/browse/"][target=_self]');

  if (projectElement) {
    project = projectElement.textContent.trim();
  }

  return project;
}

const getStoryId = () => {
  return $('[data-test-id="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]').innerText.split('\n')[0];
};

const getStoryTitle = () => {
  return $('[data-test-id="issue.views.issue-base.foundation.summary.heading"]').innerText;
};

// Matches field names to appropriate get function
const customTemplateMap = {
  epicName: getEpicName,
  storyId: getStoryId,
  storyTitle: getStoryTitle
};

// Jira 2017 board sidebar
togglbutton.render(
  '#ghx-detail-view [spacing] h1:not(.toggl)',
  { observe: true },
  async function () {
    if (process.env.DEBUG) {
      console.info('🏃 "Jira 2017 sidebar" rendering');
    }
    const rootElem = $('#ghx-detail-view');
    const container = createTag('div', 'jira-ghx-toggl-button');
    const titleElem = $('[spacing] h1', rootElem);
    const numElem = $('[spacing] a', rootElem);
    const projectElem = $('.bgdPDV');
    let description = titleElem.textContent;
    if (numElem !== null) {
      description = numElem.textContent + ' ' + description;
    }

    const templateSettings = new CustomTemplateMessenger('getJiraCustomTemplateSettings');
    await templateSettings.fetchSettings();
    const templateParser = new CustomTemplateParser(customTemplateMap, templateSettings.customTemplate);

    const link = togglbutton.createTimerLink({
      className: 'jira2017',
      description: templateSettings.useCustomTemplate ? templateParser.parse() : description,
      buttonType: 'minimal',
      projectName: projectElem && projectElem.textContent
    });

    container.appendChild(link);
    numElem.parentNode.appendChild(container);
  }
);

// Jira Jan 2020 issue detail page. Uses functions for timer values due to SPA on issue-lists.
togglbutton.render(
  // The main "issue link" at the top of the issue.
  '#jira-issue-header:not(.toggl)',
  { observe: true },
  async function (elem) {
    const container = elem.querySelector('[class^=BreadcrumbsContainer]');
    const issueNumberElement = container.lastElementChild;

    if (container.querySelector('.toggl-button')) {
      // We're checking for existence of the button as re-rendering in Jira SPA is not reliable for our uses.
      if (process.env.DEBUG) {
        console.info('🚫 "Jira 2020-01 issue detail" quit rendering early');
      }
      return;
    }

    if (process.env.DEBUG) {
      console.info('🏃 "Jira 2020-01 issue detail" rendering');
    }

    const templateSettings = new CustomTemplateMessenger('getJiraCustomTemplateSettings');
    await templateSettings.fetchSettings();
    const templateParser = new CustomTemplateParser(customTemplateMap, templateSettings.customTemplate);

    const link = togglbutton.createTimerLink({
      className: 'jira2018',
      description: templateSettings.useCustomTemplate ? templateParser.parse() : getDescription(issueNumberElement),
      projectName: getProject,
      container: '#jira-issue-header'
    });

    container.appendChild(link);
  }
);

// Jira 2017 issue page
togglbutton.render(
  '.issue-header-content:not(.toggl)',
  { observe: true },
  function (elem) {
    if (process.env.DEBUG) {
      console.info('🏃 "Jira 2017 issue page" rendering');
    }

    const numElem = $('#key-val', elem);
    const titleElem = $('#summary-val', elem) || '';
    let projectElem = $('.bgdPDV');
    let description;

    if (titleElem) {
      description = titleElem.textContent.trim();
    }

    if (numElem !== null) {
      if (description) {
        description = ' ' + description;
      }
      description = numElem.textContent + description;
    }

    if (projectElem === null) {
      projectElem = $('[data-test-id="navigation-apps.project-switcher-v2"] button > div:nth-child(2) > div');
    }
    // JIRA server support
    if (projectElem === null) {
      projectElem = $('#project-name-val');
    }

    const link = togglbutton.createTimerLink({
      className: 'jira2017',
      description: description,
      projectName: projectElem && projectElem.textContent.trim()
    });

    link.style.marginLeft = '8px';

    const issueLinkContainer =
      ($('.issue-link') || {}).parentElement || ($('.aui-nav li') || {}).lastElementChild;
    issueLinkContainer && issueLinkContainer.appendChild(link);
  }
);

// Jira pre-2017
togglbutton.render('#ghx-detail-issue:not(.toggl)', { observe: true }, function (
  elem
) {
  const container = createTag('div', 'ghx-toggl-button');
  const titleElem = $('[data-field-id="summary"]', elem);
  const numElem = $('.ghx-fieldname-issuekey a');
  const projectElem = $('.ghx-project', elem);
  let description = titleElem.textContent;
  if (numElem !== null) {
    description = numElem.textContent + ' ' + description;
  }

  const link = togglbutton.createTimerLink({
    className: 'jira',
    description: description,
    projectName: projectElem && projectElem.textContent
  });

  container.appendChild(link);
  $('#ghx-detail-head').appendChild(container);
});

// Jira pre-2017
togglbutton.render(
  '.issue-header-content:not(.toggl)',
  { observe: true },
  function (elem) {
    let description;
    const numElem = $('#key-val', elem);
    const titleElem = $('#summary-val', elem) || '';
    const projectElem = $('#project-name-val', elem);
    if (titleElem) {
      description = titleElem.textContent;
    }

    if (numElem !== null) {
      if (description) {
        description = ' ' + description;
      }
      description = numElem.textContent + description;
    }

    const link = togglbutton.createTimerLink({
      className: 'jira',
      description: description,
      projectName: projectElem && projectElem.textContent
    });

    const ul = createTag('ul', 'toolbar-group');
    const li = createTag('li', 'toolbar-item');
    li.appendChild(link);
    ul.appendChild(li);
    $('.toolbar-split-left').appendChild(ul);
  }
);

// Confluence
togglbutton.render('#title-heading:not(.toggl)', { observe: true }, function (
  elem
) {
  const titleElem = $('[id="title-text"]', elem);
  const description = titleElem.textContent.trim();

  const link = togglbutton.createTimerLink({
    className: 'confluence',
    description: description
  });

  $('#title-text').appendChild(link);
});
