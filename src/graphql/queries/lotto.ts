import { gql } from "@apollo/client";

export const GET_RESULT_LOTTO_TYPES = gql`
  query GetResultLottoTypes(
    $first: Int!
    $offset: Int!
    $filter: lotto_typesBoolExp
    $sortOrder: [lotto_typesOrderBy!]
  ) {
    lotto_typesCollection(
      first: $first
      offset: $offset
      orderBy: $sortOrder
      filter: $filter
    ) {
      edges {
        node {
          id
          name
          draw_resultsCollection {
            totalCount
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const GET_LOTTO_TYPES = gql`
  query GetLottoTypes(
    $first: Int!
    $offset: Int!
    $filter: lotto_typesBoolExp
    $sortOrder: [lotto_typesOrderBy!]
  ) {
    lotto_typesCollection(
      first: $first
      offset: $offset
      orderBy: $sortOrder
      filter: $filter
    ) {
      edges {
        node {
          id
          game_type
          draw_time
          cutoff_time
          name
          days_active
          is_active
          number_of_digits
          min_number
          max_number
          logo_image
          betsCollection {
            totalCount
          }
          draw_resultsCollection {
            totalCount
          }
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

// Same as GET_LOTTO_TYPES minus per-type bet/result counts, which time out on large bets tables.
export const GET_LOTTO_TYPE_OPTIONS = gql`
  query GetLottoTypeOptions(
    $first: Int!
    $offset: Int!
    $filter: lotto_typesBoolExp
    $sortOrder: [lotto_typesOrderBy!]
  ) {
    lotto_typesCollection(
      first: $first
      offset: $offset
      orderBy: $sortOrder
      filter: $filter
    ) {
      edges {
        node {
          id
          game_type
          draw_time
          cutoff_time
          name
          days_active
          is_active
          number_of_digits
          min_number
          max_number
          logo_image
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

export const GET_LOTTO_TYPE = gql`
  query GetLottoType($lottoTypeId: UUID!) {
    lotto_typesCollection(filter: { id: { eq: $lottoTypeId } }) {
      edges {
        node {
          id
          game_type
          draw_time
          cutoff_time
          name
          days_active
          is_active
          number_of_digits
          min_number
          max_number
          logo_image
        }
      }
    }
  }
`;

export const UPDATE_LOTTO_TYPE = gql`
  mutation UpdateLottoType(
    $id: UUID!
    $gameType: String
    $drawTime: String
    $cutoffTime: String
    $name: String
    $daysActive: String
    $isActive: Boolean
    $numberOfDigits: Int
    $minNumber: Int
    $maxNumber: Int
    $logoImage: String
    $isArchive: Boolean
  ) {
    updatelotto_typesCollection(
      set: {
        game_type: $gameType
        draw_time: $drawTime
        cutoff_time: $cutoffTime
        name: $name
        days_active: $daysActive
        is_active: $isActive
        number_of_digits: $numberOfDigits
        min_number: $minNumber
        max_number: $maxNumber
        logo_image: $logoImage
        is_archive: $isArchive
      }
      filter: { id: { eq: $id } }
    ) {
      records {
        id
      }
    }
  }
`;

export const CREATE_LOTTO_TYPE = gql`
  mutation CreateLottoType(
    $gameType: String!
    $drawTime: String!
    $cutoffTime: String
    $name: String!
    $daysActive: String!
    $isActive: Boolean!
    $numberOfDigits: Int!
    $minNumber: Int!
    $maxNumber: Int!
    $logoImage: String
  ) {
    insertIntolotto_typesCollection(
      objects: [
        {
          game_type: $gameType
          draw_time: $drawTime
          cutoff_time: $cutoffTime
          name: $name
          days_active: $daysActive
          is_active: $isActive
          number_of_digits: $numberOfDigits
          min_number: $minNumber
          max_number: $maxNumber
          logo_image: $logoImage
        }
      ]
    ) {
      records {
        id
      }
    }
  }
`;

export const BULK_UPDATE_LOTTO_STATUS = gql`
  mutation BulkUpdateLottoStatus($lottoIds: [Int!]!, $isArchive: Boolean!) {
    update_lotto_types_status(
      lotto_type_ids: $lottoIds
      new_status: $isArchive
    ) {
      totalCount
    }
  }
`;
