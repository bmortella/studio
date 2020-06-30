import difference from 'lodash/difference';
import findKey from 'lodash/findKey';
import intersection from 'lodash/intersection';
import transform from 'lodash/transform';

function _getBooleanVal(value) {
  return typeof value === 'string' ? value === 'true' : value;
}

export function generateFilterMixin(filterMap) {
  const paramKeys = Object.values(filterMap).flatMap(f => Object.keys(f.params));
  return {
    data() {
      return {
        filterKey: '',
      };
    },
    computed: {
      filter: {
        get() {
          // Return filter where all param conditions are met
          const filterKeys = intersection(Object.keys(this.$route.query), paramKeys);
          let key = findKey(filterMap, value => {
            return filterKeys.every(field => {
              return value.params[field] === _getBooleanVal(this.$route.query[field]);
            });
          });
          return key;
        },
        set(value) {
          // Get params that aren't part of the filterMap
          const otherFilters = difference(Object.keys(this.$route.query), paramKeys).reduce(
            (result, key) => {
              result[key] = this.$route.query[key];
              return result;
            },
            {}
          );

          // Set the router with the params from the filterMap and current route
          this.updateQueryParams({
            ...otherFilters,
            ...filterMap[value].params,
            page: 1,
          });
        },
      },
      filters() {
        return Object.entries(filterMap).map(([key, value]) => {
          return { key, label: value.label };
        });
      },
    },
    methods: {
      updateQueryParams(params) {
        const query = transform(
          params,
          (result, value, key) => {
            if (value != null) {
              result[key] = value;
            }
          },
          {}
        );
        this.$router.push({ query });
      },
      search: function(search) {
        this.updateQueryParams({ search, page: 1 });
      },
      clearSearch: function() {
        this.updateQueryParams({ search: null });
      },
    },
  };
}

export const filterMixin = {
  methods: {
    updateQueryParams(params) {
      params = {
        ...this.$route.query,
        ...params,
      };
      const query = transform(
        params,
        (result, value, key) => {
          if (value != null) {
            result[key] = value;
          }
        },
        {}
      );
      this.$router.push({ query });
    },
    search: function(search) {
      this.updateQueryParams({ search, page: 1 });
    },
    filter: function(filter) {
      this.updateQueryParams({ filter, page: 1 });
    },
    clearSearch: function() {
      this.updateQueryParams({ search: null });
    },
  },
};

export const tableMixin = {
  data() {
    return {
      loading: false,
    };
  },
  computed: {
    pagination: {
      get() {
        let params = {
          rowsPerPage: Number(this.$route.query.page_size) || 25,
          page: Number(this.$route.query.page) || 1,
        };
        // Add descending if it's in the route query params
        if (this.$route.query.descending !== undefined) {
          params.descending = this.$route.query.descending.toString() === 'true';
        }
        // Add sortBy if it's in the route query params
        if (this.$route.query.sortBy) {
          params.sortBy = this.$route.query.sortBy;
        }

        return params;
      },
      set(pagination) {
        let params = {
          ...this.$route.query,
          ...pagination,
        };

        // Clean unused params
        params = transform(
          params,
          (result, value, key) => {
            if (key === 'rowsPerPage') {
              result['page_size'] = value;
            } else if (key === 'totalItems') {
              return;
            } else {
              result[key] = value;
            }
          },
          {}
        );

        this.$router
          .replace({
            ...this.$route,
            query: {
              ...this.$route.query,
              ...params,
            },
          })
          .catch(error => {
            if (error && error.name != 'NavigationDuplicated') {
              throw error;
            }
          });
      },
    },
  },
  watch: {
    '$route.query'() {
      this._loadItems();
    },
  },
  mounted() {
    this._loadItems();
  },
  methods: {
    _loadItems() {
      this.loading = true;
      this.fetch(this.$route.query).then(() => {
        this.loading = false;
      });
    },
    fetch() {
      throw Error('Must implement fetch method if using tableMixin');
    },
  },
};
