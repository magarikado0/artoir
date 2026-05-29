export const PUBLISHER_KIND = {
  ORGANIZATION: 'organization',
  PERSON: 'person',
}

export function getPublisherKind(publisher) {
  return publisher?.kind === PUBLISHER_KIND.PERSON ? PUBLISHER_KIND.PERSON : PUBLISHER_KIND.ORGANIZATION
}

export function isPersonPublisher(publisher) {
  return getPublisherKind(publisher) === PUBLISHER_KIND.PERSON
}

export function getPublisherKindLabel(publisher) {
  return isPersonPublisher(publisher) ? '個人' : '団体'
}

export function getPublisherNameLabel(publisherOrKind) {
  const kind = typeof publisherOrKind === 'string' ? publisherOrKind : getPublisherKind(publisherOrKind)
  return kind === PUBLISHER_KIND.PERSON ? '表示名' : '団体名'
}

export function getPublisherDescriptionPlaceholder(publisherOrKind) {
  const kind = typeof publisherOrKind === 'string' ? publisherOrKind : getPublisherKind(publisherOrKind)
  return kind === PUBLISHER_KIND.PERSON ? '活動や作品について入力...' : '団体の説明文を入力...'
}

