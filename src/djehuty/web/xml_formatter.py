import re
import xml.etree.ElementTree as ET
from djehuty.utils.convenience import value_or, value_or_none

class ElementMaker:
    '''
    Convenience class to simplify construction of xml trees. The number of
    steps is reduced by combining common ltree operations in a single call.
    An instance of this class can hold a set of namespace definitions,
    enabling tree construction using prefixes instead of full namespaces
    in element and attribute names. Default namespace is also obeyed.
    '''
    def __init__(self, NS={}):
        self.NS = NS
        for prefix, uri in NS.items():
            ET.register_namespace(prefix, uri)
    def resolve(self, name, isElement=True):
        if ':' in name:
            prefix, suffix = name.split(':' ,1)
            return f'{{{self.NS[prefix]}}}{suffix}'
        elif isElement and '' in self.NS:
            return f'{{{self.NS[""]}}}{name}'
        return name
    def child(self, parent, name, attrib={}, text=None):
        if parent is not None:
            element = ET.SubElement(parent, self.resolve(name))
        else:
            element = ET.Element(self.resolve(name))
        for attname, val in attrib.items():
            element.set(self.resolve(attname, False), val)
        if text:
            element.text = f'{text}'
        return element
    def child_option(self, parent, name, source, key, attrib={}):
        if key in source:
            return self.child(parent, name, attrib, f'{source[key]}')
        return None
    def root(self, name, attrib={}, text=None):
        return self.child(None, name, attrib, text)

def xml_str(tree, indent=True):
    if indent:
        ET.indent(tree)
    return ET.tostring(tree, encoding='utf8', short_empty_elements=True)

def scrub(obj): # move to convenience.py?
    ''' eliminate from construct of dicts and lists all values x for which bool(x)==False '''
    if isinstance(obj, dict):
        scrubbed = {key:scrub(val) for key,val in obj.items() if val}
        return {key:val for key,val in scrubbed.items() if val}
    elif isinstance(obj, list):
        scrubbed = [scrub(val) for val in obj if val]
        return [val for val in scrubbed if val]
    elif obj:
        return obj

def datacite_tree(parameters, debug=False):
    parameters = scrub(parameters)
    NS = {''   : 'http://datacite.org/schema/kernel-4',
          'xsi': 'http://www.w3.org/2001/XMLSchema-instance'}
    maker = ElementMaker(NS)
    schema_url = 'http://schema.datacite.org/meta/kernel-4.4/metadata.xsd'
    root = maker.root('resource', {'xsi:schemaLocation': f'{NS[""]} {schema_url}'})
    item = parameters['item']

    #01 identifier
    maker.child(root, 'identifier', {'identifierType':'DOI'}, parameters['doi'])

    #02 creators
    orcid_att = {'nameIdentifierScheme': 'https://orcid.org/'}
    personal_att = {'nameType': 'Personal'}
    creators = parameters['authors']
    creators_element = maker.child(root,'creators')
    for creator in creators:
        creator_att = personal_att if 'orcid_id' in creator else {}
        creator_element = maker.child(creators_element, 'creator')
        maker.child_option(creator_element, 'creatorName', creator, 'full_name', creator_att)
        maker.child_option(creator_element, 'givenName', creator, 'first_name')
        maker.child_option(creator_element, 'familyName', creator, 'last_name')
        maker.child_option(creator_element, 'nameIdentifier', creator, 'orcid_id', orcid_att)

    #03 titles
    maker.child(maker.child(root, 'titles'), 'title', {}, item['title'])

    #04 publisher
    maker.child(root, 'publisher', {}, value_or(item, 'publisher', '4TU.ResearchData'))

    #05 publicationYear
    maker.child(root, 'publicationYear', {}, parameters['published_year'])

    #06 resourceType
    rtype = value_or(item, 'defined_type_name', 'Collection').capitalize()
    if rtype not in ('Dataset','Software','Collection'):
        rtype = 'Text'
    maker.child(root, 'resourceType', {'resourceTypeGeneral': rtype}, rtype)

    #07 subjects
    subjects_element = maker.child(root, 'subjects')
    if 'categories' in parameters:
        for cat in parameters['categories']:
            maker.child(
                subjects_element,
                'subject',
                { 'subjectScheme'     : 'Australian and New Zealand Standard Research Classification (ANZSRC), 2008',
                  'classificationCode': cat['classification_code'] },
                cat['title']
            )
    if 'tags' in parameters:
        for tag in parameters['tags']:
            maker.child(subjects_element, 'subject', {}, tag)
    if 'time_coverage' in item:
        maker.child(subjects_element, 'subject', {}, f"Time: {item['time_coverage']}")

    #08 contributors
    has_organizations = 'organizations' in parameters
    has_contributors = 'contributors' in parameters
    if has_organizations or has_contributors:
        contributors_element = maker.child(root, 'contributors')
        type_att = {'contributorType': 'Other'}
        orcid_att = {'nameIdentifierScheme': 'https://orcid.org/'}
        if has_contributors:
            for contributor in parameters['contributors']:
                contributor_element = maker.child(contributors_element, 'contributor', type_att)
                name = contributor['name']
                orcid = value_or_none(contributor, 'orcid')
                maker.child(contributor_element, 'contributorName', {'nameType': 'Personal'}, name)
                if orcid:
                    maker.child(contributor_element, 'nameIdentifier', orcid_att, orcid)
        if has_organizations:
            for name in parameters['organizations']:
                contributor_element = maker.child(contributors_element, 'contributor', type_att)
                maker.child(contributor_element, 'contributorName', {'nameType': 'Organizational'}, name)

    #09 dates
    maker.child(maker.child(root, 'dates'), 'date', {'dateType': 'Issued'}, parameters['published_date'])

    #10 language
    if 'language' in item:
        maker.child(root, 'language', {}, item['language'])

    #11 relatedIdentifiers
    has_doi = 'resource_doi' in item
    has_ref = 'references' in parameters
    if has_doi or has_ref:
        relations_element = maker.child(root, 'relatedIdentifiers')
        if has_doi:
            maker.child(relations_element,
                        'relatedIdentifier',
                        {'relatedIdentifierType': 'DOI', 'relationType': 'IsSupplementTo'},
                        item['resource_doi'])
        if has_ref:
            for ref in parameters['references']:
                maker.child(relations_element,
                            'relatedIdentifier',
                            {'relatedIdentifierType': 'URL', 'relationType': 'References'},
                            ref['url'])

    #12 formats
    if 'format' in item:
        maker.child(maker.child(root, 'formats'), 'format', {}, item['format'])

    #13 version
    maker.child(root, 'version', {}, f'{item["version"]}')

    #14 rightsList
    if 'license_id' in item:
        maker.child(maker.child(root, 'rightsList'),
                    'rights',
                    {'rightsURI': item['license_url']},
                    item['license_name'])

    #15 descriptions
    maker.child(maker.child(root, 'descriptions'),
                'description',
                {'descriptionType': 'Abstract'},
                item['description'])

    #16 geoLocations
    has_geo = 'geolocation' in item
    coordinates = value_or(parameters, 'coordinates', {})
    has_point = 'lat_valid' in coordinates and 'lon_valid' in coordinates
    if has_geo or has_point:
        geo_element = maker.child(maker.child(root, 'geoLocations'), 'geoLocation')
        if has_geo:
            maker.child(geo_element, 'geoLocationPlace', {}, item['geolocation'])
        if has_point:
            point_element = maker.child(geo_element, 'geoLocationPoint')
            maker.child(point_element, 'pointLongitude', {}, coordinates['lon_valid'])
            maker.child(point_element, 'pointLatitude', {}, coordinates['lat_valid'])

    #17 fundingReferences
    fT = 'funding_list'
    if 'fundings' in parameters:
        fundings_element = maker.child(root, 'fundingReferences')
        for funding in parameters['fundings']:
            funding_element = maker.child(fundings_element, 'fundingReference')
            maker.child(funding_element, 'funderName', {},
                        value_or(funding, 'funder_name', 'unknown'))
            maker.child_option(funding_element, 'awardNumber', funding, 'grant_code')
            maker.child_option(funding_element, 'awardTitle', funding, 'title')

    #debug
    if debug:
        param_strings = [f'{key:<15}: {val}' for key, val in parameters.items()]
        root.insert(0, ET.Comment('DEBUG\n' + '\n'.join(param_strings)))

    return root

def datacite(parameters):
    return xml_str(datacite_tree(parameters))