import { gql } from "@apollo/client";

export const GET_RESULTS = gql`
  query GetResults(
    $first: Int!
    $offset: Int!
    $searchTerm: String
    $sortOrder: [draw_resultsOrderBy!]
    $filter: draw_resultsBoolExp
  ) {
    draw_resultsCollection(
      first: $first
      offset: $offset
      filter: $filter
      orderBy: $sortOrder
    ) {
      edges {
        node {
          id
          draw_date
          draw_type
          is_archive
          lotto_types {
            id
            name
            game_type
            max_number
            min_number
            number_of_digits
            logo_image
          }
          combination
          created_at
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const CREATE_RESULT = gql`
  mutation CreateResult(
    $draw_date: Date!
    $draw_type: Int!
    $combination: String!
  ) {
    insertIntodraw_resultsCollection(
      objects: {
        draw_date: $draw_date
        draw_type: $draw_type
        combination: $combination
      }
    ) {
      records {
        id
        draw_date
        draw_type
        combination
        created_at
      }
    }
  }
`;

export const UPDATE_RESULT = gql`
  mutation UpdateResult(
    $id: Int!
    $draw_date: Date
    $draw_type: Int
    $combination: String!
  ) {
    updatedraw_resultsCollection(
      set: {
        draw_date: $draw_date
        draw_type: $draw_type
        combination: $combination
      }
      filter: { id: { eq: $id } }
    ) {
      records {
        id
        draw_date
        draw_type
        combination
        created_at
      }
    }
  }
`;

export const DELETE_RESULT = gql`
  mutation DeleteResult($id: Int!) {
    updatedraw_resultsCollection(
      set: { is_archive: true }
      filter: { id: { eq: $id } }
    ) {
      records {
        id
        is_archive
      }
    }
  }
`;
